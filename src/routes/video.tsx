import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useAuth } from "@/lib/auth";
import { generateVideo } from "@/server/video.functions";
import { Video, Sparkles, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/video")({
  head: () => ({ meta: [{ title: "Video Creator — HyperPost AI" }, { name: "description", content: "Generate cinematic AI video clips." }] }),
  component: VideoPage,
});

const RATIOS = [
  { v: "9:16" as const, label: "Portrait", w: "w-9", h: "h-16" },
  { v: "1:1" as const, label: "Square", w: "w-12", h: "h-12" },
  { v: "16:9" as const, label: "Landscape", w: "w-16", h: "h-9" },
];

function VideoPage() {
  useRequireAuth();
  const { user, profile, refreshProfile } = useAuth();
  const generateVideoFn = useServerFn(generateVideo);
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [duration, setDuration] = useState(5);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ url?: string; prompt: string } | null>(null);

  const generate = async () => {
    if (!prompt.trim() || !user) return;
    if (!profile?.unlimited && (profile?.credits ?? 0) < 1) {
      toast.error("Out of credits — upgrade your plan.");
      return;
    }
    setBusy(true);
    setLast({ prompt, url: undefined });
    try {
      const res = await generateVideoFn({ data: { prompt, ratio, duration } });
      await refreshProfile();
      setLast({ prompt, url: res.url });
      toast.success("Video ready!");
    } catch (e: any) {
      toast.error(e?.message ?? "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    if (!last?.url) return;
    try {
      const res = await fetch(last.url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `hyperpost-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Download failed");
    }
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
              disabled={busy}
              placeholder="A cinematic shot of a neon-lit Tokyo street at night, rain reflections, slow dolly forward…"
              className="w-full px-4 py-3 rounded-xl glass-strong outline-none focus:ring-2 focus:ring-[oklch(0.85_0.18_220)] resize-none disabled:opacity-60" />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Aspect ratio</label>
              <div className="flex gap-2">
                {RATIOS.map((r) => (
                  <button key={r.v} onClick={() => setRatio(r.v)} disabled={busy}
                    className={`flex-1 p-3 rounded-xl glass-strong flex flex-col items-center gap-2 transition disabled:opacity-50 ${ratio === r.v ? "ring-2 ring-[oklch(0.85_0.18_220)]" : "hover:bg-white/10"}`}>
                    <div className={`${r.w} ${r.h} rounded bg-gradient-brand`} />
                    <span className="text-xs">{r.v}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Duration: {duration}s</label>
              <input type="range" min={5} max={10} step={5} value={duration} disabled={busy}
                onChange={(e) => setDuration(+e.target.value)} className="w-full accent-[oklch(0.85_0.18_220)]" />
            </div>
          </div>

          <button disabled={busy || !prompt.trim()} onClick={generate}
            className="w-full py-3 rounded-xl bg-gradient-brand text-background font-semibold glow-cyan hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {busy ? <><Loader2 className="size-4 animate-spin" /> Generating your video… this takes 30–60 seconds</> : <><Sparkles className="size-4" /> Generate video (1 credit)</>}
          </button>
        </GlassCard>

        {busy && (
          <GlassCard>
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-[oklch(0.85_0.18_220)]" />
              <div>
                <p className="font-medium">Rendering frames…</p>
                <p className="text-sm text-muted-foreground">Please keep this tab open. Typical wait: 30–60 seconds.</p>
              </div>
            </div>
          </GlassCard>
        )}

        {!busy && last?.url && (
          <GlassCard>
            <h3 className="font-semibold mb-2">Latest</h3>
            <p className="text-sm text-muted-foreground mb-4">{last.prompt}</p>
            <video src={last.url} controls playsInline className="w-full rounded-xl mb-4 bg-black" />
            <button onClick={download}
              className="px-4 py-2 rounded-lg bg-gradient-brand text-background font-medium inline-flex items-center gap-2">
              <Download className="size-4" /> Download
            </button>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
