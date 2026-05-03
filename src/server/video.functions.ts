import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authed } from "@/integrations/supabase/authed-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { spendCredits } from "./credits.server";

const VideoInput = z.object({
  prompt: z.string().trim().min(3).max(2000),
  ratio: z.enum(["9:16", "1:1", "16:9"]).default("9:16"),
  duration: z.number().int().min(5).max(10).default(5),
});

/**
 * Generate a real video via fal.ai Kling text-to-video.
 * Polls the fal queue until completion, re-hosts the MP4 in our Supabase
 * Storage bucket, and records the generation in the DB.
 */
export const generateVideo = createServerFn({ method: "POST" })
  .middleware([authed])
  .inputValidator((d) => VideoInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const apiKey = process.env.FAL_KEY ?? process.env.FAL_API_KEY;
    if (!apiKey) throw new Error("Video engine not configured (missing FAL_KEY)");

    await spendCredits(userId, 1);

    const MODEL = "fal-ai/kling-video/v1.6/standard/text-to-video";
    // Kling supports only 5 or 10 second durations
    const dur = data.duration <= 7 ? "5" : "10";

    const submit = await fetch(`https://queue.fal.run/${MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: data.prompt,
        duration: dur,
        aspect_ratio: data.ratio,
      }),
    });
    if (!submit.ok) {
      const txt = await submit.text();
      console.error("[fal submit failed]", submit.status, txt);
      throw new Error(`Video submit failed [${submit.status}]: ${txt.slice(0, 300)}`);
    }
    const queued = (await submit.json()) as {
      request_id: string;
      status_url?: string;
      response_url?: string;
    };
    const requestId = queued.request_id;
    const statusUrl =
      queued.status_url ?? `https://queue.fal.run/${MODEL}/requests/${requestId}/status`;
    const responseUrl =
      queued.response_url ?? `https://queue.fal.run/${MODEL}/requests/${requestId}`;

    // Poll up to ~5 minutes (Kling can take a couple of minutes)
    let videoUrl: string | undefined;
    const deadline = Date.now() + 300_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3000));
      const s = await fetch(statusUrl, { headers: { Authorization: `Key ${apiKey}` } });
      if (!s.ok) continue;
      const sj = (await s.json()) as { status?: string };
      if (sj.status === "COMPLETED") {
        const r2 = await fetch(responseUrl, {
          headers: { Authorization: `Key ${apiKey}` },
        });
        const rj = (await r2.json()) as { video?: { url?: string } };
        videoUrl = rj?.video?.url;
        break;
      }
      if (sj.status === "FAILED" || sj.status === "ERROR") {
        throw new Error("Video generation failed on provider side");
      }
    }
    if (!videoUrl) throw new Error("Video generation timed out — try again");

    // Re-host the MP4 in our bucket
    const mp4Res = await fetch(videoUrl);
    if (!mp4Res.ok) throw new Error("Could not fetch generated video");
    const bytes = new Uint8Array(await mp4Res.arrayBuffer());

    const path = `${userId}/video/${Date.now()}.mp4`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("generations")
      .upload(path, bytes, { contentType: "video/mp4", upsert: false });
    if (upErr) throw upErr;
    const { data: pub } = supabaseAdmin.storage.from("generations").getPublicUrl(path);

    const { data: gen, error } = await supabaseAdmin
      .from("generations")
      .insert({
        user_id: userId,
        type: "video",
        prompt: data.prompt,
        output_url: pub.publicUrl,
        metadata: {
          ratio: data.ratio,
          duration: Number(dur),
          provider: "fal/kling-video-v1-standard",
        },
      })
      .select()
      .single();
    if (error) throw error;

    return { url: pub.publicUrl, id: gen.id };
  });
