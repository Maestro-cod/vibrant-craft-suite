import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ topic: z.string().min(3).max(500) });

export const generateScript = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a viral short-form video script writer. Write a complete, punchy 60-90 second video script with a HOOK, BODY (3 beats), and CTA. Use clear section headers. Keep it visual and conversational.",
          },
          { role: "user", content: `Topic: ${data.topic}` },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI gateway failed [${res.status}]: ${t}`);
    }
    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? "";
    return { text };
  });
