import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured. Add it in project secrets." }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
        let body: { text?: string; voiceId?: string };
        try { body = await request.json() as any; } catch { return new Response("Invalid JSON", { status: 400 }); }
        const text = (body.text ?? "").trim();
        const voiceId = body.voiceId ?? "JBFqnCBsd6RMkjVDRZzb";
        if (!text || text.length > 2000) return new Response("Invalid text", { status: 400 });

        const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
          method: "POST",
          headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
        });
        if (!r.ok) {
          const t = await r.text();
          return new Response(`ElevenLabs error [${r.status}]: ${t}`, { status: 502 });
        }
        const audio = await r.arrayBuffer();
        return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
      },
    },
  },
});
