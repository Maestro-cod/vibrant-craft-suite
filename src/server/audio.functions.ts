import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authed } from "@/integrations/supabase/authed-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { spendCredits } from "./credits.server";

const VoiceInput = z.object({
  text: z.string().trim().min(1).max(2000),
  voiceId: z.string().min(1).max(64),
});

export const generateVoice = createServerFn({ method: "POST" })
  .middleware([authed])
  .inputValidator((d) => VoiceInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("Voice engine not configured");

    await spendCredits(userId, 1);

    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${data.voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: data.text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.55, similarity_boost: 0.78, style: 0.35, use_speaker_boost: true },
        }),
      },
    );
    if (!r.ok) throw new Error(`Voice failed [${r.status}]: ${await r.text()}`);
    const audio = new Uint8Array(await r.arrayBuffer());

    const path = `${userId}/voice/${Date.now()}.mp3`;
    const { error: upErr } = await supabaseAdmin.storage.from("generations").upload(path, audio, {
      contentType: "audio/mpeg",
      upsert: false,
    });
    if (upErr) throw upErr;
    const { data: pub } = supabaseAdmin.storage.from("generations").getPublicUrl(path);

    const { data: gen, error } = await supabaseAdmin
      .from("generations")
      .insert({
        user_id: userId,
        type: "voiceover",
        prompt: data.text.slice(0, 500),
        output_url: pub.publicUrl,
        metadata: { voiceId: data.voiceId },
      })
      .select()
      .single();
    if (error) throw error;
    return { url: pub.publicUrl, id: gen.id };
  });

const MusicInput = z.object({
  prompt: z.string().trim().min(3).max(450),
  duration: z.number().int().min(5).max(22).default(15),
});

/**
 * AI music: uses ElevenLabs sound-generation endpoint (text-to-audio).
 * Great for ambient beds, FX scores, vibe loops up to 22s.
 */
export const generateMusic = createServerFn({ method: "POST" })
  .middleware([authed])
  .inputValidator((d) => MusicInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("Audio engine not configured");

    await spendCredits(userId, 1);

    const r = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: data.prompt,
        duration_seconds: data.duration,
        prompt_influence: 0.5,
      }),
    });
    if (!r.ok) throw new Error(`Music failed [${r.status}]: ${await r.text()}`);
    const audio = new Uint8Array(await r.arrayBuffer());

    const path = `${userId}/music/${Date.now()}.mp3`;
    const { error: upErr } = await supabaseAdmin.storage.from("generations").upload(path, audio, {
      contentType: "audio/mpeg",
      upsert: false,
    });
    if (upErr) throw upErr;
    const { data: pub } = supabaseAdmin.storage.from("generations").getPublicUrl(path);

    const { data: gen, error } = await supabaseAdmin
      .from("generations")
      .insert({
        user_id: userId,
        type: "music",
        prompt: data.prompt,
        output_url: pub.publicUrl,
        metadata: { duration: data.duration },
      })
      .select()
      .single();
    if (error) throw error;
    return { url: pub.publicUrl, id: gen.id };
  });
