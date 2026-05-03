import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { spendCredits } from "./credits.server";

const VideoInput = z.object({
  prompt: z.string().trim().min(3).max(800),
  ratio: z.enum(["9:16", "1:1", "16:9"]).default("9:16"),
  duration: z.number().int().min(3).max(15).default(5),
});

// Map UI ratio to fal aspect ratio strings
const RATIO_MAP: Record<string, string> = {
  "9:16": "9:16",
  "1:1": "1:1",
  "16:9": "16:9",
};

/**
 * Generate a real video via fal.ai (fast-animatediff text-to-video).
 * Synchronous call — fal returns the hosted MP4 URL when finished.
 * We re-host the MP4 into Supabase Storage so the Download button serves
 * a permanent file from our own bucket.
 */
export const generateVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => VideoInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) throw new Error("Video engine not configured (missing FAL_API_KEY)");

    await spendCredits(userId, 1);

    // Submit to fal queue
    const submit = await fetch("https://queue.fal.run/fal-ai/fast-animatediff/text-to-video", {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: data.prompt,
        num_frames: Math.min(32, Math.max(16, data.duration * 4)),
        aspect_ratio: RATIO_MAP[data.ratio] ?? "9:16",
      }),
    });
    if (!submit.ok) {
      throw new Error(`Video submit failed [${submit.status}]: ${await submit.text()}`);
    }
    const queued = (await submit.json()) as { request_id: string; status_url?: string; response_url?: string };
    const requestId = queued.request_id;
    const statusUrl = queued.status_url ?? `https://queue.fal.run/fal-ai/fast-animatediff/requests/${requestId}/status`;
    const responseUrl = queued.response_url ?? `https://queue.fal.run/fal-ai/fast-animatediff/requests/${requestId}`;

    // Poll up to ~90s
    let videoUrl: string | undefined;
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2500));
      const s = await fetch(statusUrl, { headers: { Authorization: `Key ${apiKey}` } });
      if (!s.ok) continue;
      const sj = (await s.json()) as { status?: string };
      if (sj.status === "COMPLETED") {
        const r2 = await fetch(responseUrl, { headers: { Authorization: `Key ${apiKey}` } });
        const rj = (await r2.json()) as { video?: { url?: string } };
        videoUrl = rj?.video?.url;
        break;
      }
      if (sj.status === "FAILED" || sj.status === "ERROR") {
        throw new Error("Video generation failed on provider side");
      }
    }
    if (!videoUrl) throw new Error("Video generation timed out — try again");

    // Download MP4 and re-host in our bucket
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
        metadata: { ratio: data.ratio, duration: data.duration, provider: "fal/fast-animatediff" },
      })
      .select()
      .single();
    if (error) throw error;

    return { url: pub.publicUrl, id: gen.id };
  });
