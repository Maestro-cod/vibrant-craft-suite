import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useAuth } from "@/lib/auth";
import { generateMusic } from "@/server/audio.functions";
import { Music, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/music")({
  head: () => ({ meta: [{ title: "AI Music — HyperPost AI" }, { name: "description", content: "Generate original music & soundscapes from a brief." }] }),
  component: MusicPage,
});

const PRESETS = [
  "Dark synthwave with deep bass, 110 BPM, cinematic build",
  "Lo-fi hip hop beat, mellow piano, vinyl crackle, 80 BPM",
  "Epic orchestral trailer, soaring strings, taiko drums",
  "Tropical house, sun-kissed plucks, summer vibe, 120 BPM",
  "Tense ambient drone, evolving pads, sci-fi atmosphere",
];

function MusicPage() {
  useRequireAuth();
  const { profile, refreshProfile } = useAuth();
  const [brief, setBrief] = useState("");
  const [duration, setDuration] = useState(15);
  const [busy, setBusy] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const generate = useServerFn(generateMusic);

  const onGenerate = async () => {
    if (!brief.trim()) return;
    if (!profile?.unlimited && (profile?.credits ?? 0) < 1) { toast.error("Out of credits — upgrade your plan."); return; }
    setBusy(true); setAudioUrl(null);
    try {
      const res = await generate({ data: { prompt: brief, duration } });
      setAudioUrl(res.url);
      await refreshProfile();
      toast.success("Track ready");
    } catch (e: any) {
      toast.error(e?.message ?? "Generation failed");
    } finally { setBusy(false); }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-xl bg-gradient-brand grid place-items-center glow-violet"><Music className="size-5 text-background" /></div>
          <div>
            <h1 className="text-3xl font-bold">AI Music</h1>
            <p className="text-muted-foreground text-sm">Describe a mood, genre or reference. Get a track up to 22 seconds.</p>
          </div>
        </div>

        <GlassCard className="space-y-5 gradient-border">
          <div>
            <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={5} maxLength={450}
              placeholder="Dark synthwave with deep bass, 110 BPM, cinematic build…"
              className="w-full px-4 py-3 rounded-xl glass-strong outline-none focus:ring-2 focus:ring-[oklch(0.65_0.25_295)] resize-none" />
            <div className="text-xs text-muted-foreground mt-1 text-right">{brief.length}/450</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-2">Quick prompts</div>
            <div className="flex gap-2 flex-wrap">
              {PRESETS.map((p) => (
                <button key={p} onClick={() => setBrief(p)} className="px-3 py-1.5 rounded-full glass-strong text-xs hover:bg-white/10">
                  {p.split(",")[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Duration: {duration}s</label>
            <input type="range" min={5} max={22} value={duration} onChange={(e) => setDuration(+e.target.value)} className="w-full accent-[oklch(0.65_0.25_295)]" />
          </div>

          <button disabled={busy || !brief.trim()} onClick={onGenerate}
            className="w-full py-3 rounded-xl bg-gradient-brand text-background font-semibold glow-violet hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            <Sparkles className={`size-4 ${busy ? "animate-spin" : ""}`} />
            {busy ? <span className="shimmer">Composing track…</span> : "Generate music (1 credit)"}
          </button>
        </GlassCard>

        {audioUrl && (
          <GlassCard className="space-y-3 animate-fade-up">
            <audio controls src={audioUrl} className="w-full" />
            <a href={audioUrl} download={`music-${Date.now()}.mp3`} target="_blank" rel="noreferrer"
              className="px-4 py-2 rounded-lg bg-gradient-brand text-background font-medium inline-flex items-center gap-2">
              <Download className="size-4" /> Download MP3
            </a>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
