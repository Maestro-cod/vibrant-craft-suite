import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Video, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/video")({
  head: () => ({ meta: [{ title: "Video Creator — HyperPost AI" }, { name: "description", content: "Generate cinematic AI video clips." }] }),
  component: VideoPage,
});

const RATIOS = [
  { v: "9:16", label: "Portrait", w: "w-9", h: "h-16" },
  { v: "1:1", label: "Square", w: "w-12", h: "h-12" },
  { v: "16:9", label: "Landscape", w: "w-16", h: "h-9" },
];

function VideoPage() {
  useRequireAuth();
  const { user, profile, refreshProfile } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState("9:16");
  const [duration, setDuration] = useState(5);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ url?: string; prompt: string } | null>(null);

  const generate = async () => {
    if (!prompt.trim() || !user) return;
    if (!profile?.unlimited && (profile?.credits ?? 0) < 1) { toast.error("Out of credits — upgrade your plan."); return; }
    setBusy(true);
    try {
      // Placeholder: video generation provider not yet wired.
      // We log the request to history so the user sees their prompt + can re-run later.
      const { data, error } = await supabase.from("generations").insert({
        user_id: user.id, type: "video", prompt,
        metadata: { ratio, duration },
      }).select().single();
      if (error) throw error;
      if (!profile?.unlimited) await supabase.from("profiles").update({ credits: (profile?.credits ?? 1) - 1 }).eq("id", user.id);
      await refreshProfile();
      setLast({ prompt, url: data.output_url ?? undefined });
      toast.success("Saved to history. Video model wiring coming soon.");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-xl bg-gradient-brand grid place-items-center glow-cyan"><Video className="size-5 text-background" /></div>
          <div>
            <h1 className="text-3xl font-bold">Video Creator</h1>
            <p className="text-muted-foreground text-sm">Cinematic AI video — your aspect, your duration.</p>
          </div>
        </div>

        <GlassCard className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-2 block">Prompt</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}
              placeholder="A cinematic shot of a neon-lit Tokyo street at night, rain reflections, slow dolly forward…"
              className="w-full px-4 py-3 rounded-xl glass-strong outline-none focus:ring-2 focus:ring-[oklch(0.85_0.18_220)] resize-none" />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Aspect ratio</label>
              <div className="flex gap-2">
                {RATIOS.map((r) => (
                  <button key={r.v} onClick={() => setRatio(r.v)}
                    className={`flex-1 p-3 rounded-xl glass-strong flex flex-col items-center gap-2 transition ${ratio === r.v ? "ring-2 ring-[oklch(0.85_0.18_220)]" : "hover:bg-white/10"}`}>
                    <div className={`${r.w} ${r.h} rounded bg-gradient-brand`} />
                    <span className="text-xs">{r.v}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Duration: {duration}s</label>
              <input type="range" min={3} max={15} value={duration} onChange={(e) => setDuration(+e.target.value)} className="w-full accent-[oklch(0.85_0.18_220)]" />
            </div>
          </div>

          <button disabled={busy || !prompt.trim()} onClick={generate}
            className="w-full py-3 rounded-xl bg-gradient-brand text-background font-semibold glow-cyan hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            <Sparkles className="size-4" /> {busy ? "Generating…" : "Generate video (1 credit)"}
          </button>
        </GlassCard>

        {last && (
          <GlassCard>
            <h3 className="font-semibold mb-2">Latest</h3>
            <p className="text-sm text-muted-foreground mb-4">{last.prompt}</p>
            <button disabled={!last.url} className="px-4 py-2 rounded-lg bg-gradient-brand text-background font-medium inline-flex items-center gap-2 disabled:opacity-50">
              <Download className="size-4" /> Download
            </button>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
