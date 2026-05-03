import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Video, Sparkles, Download, Loader2, Clock3, Coins } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/video")({
  head: () => ({
    meta: [
      { title: "Video Creator — HyperPost AI" },
      { name: "description", content: "Generate cinematic AI video clips." },
    ],
  }),
  component: VideoPage,
});

const RATIOS = [
  { v: "9:16" as const, label: "Portrait", w: "w-9", h: "h-16" },
  { v: "1:1" as const, label: "Square", w: "w-12", h: "h-12" },
  { v: "16:9" as const, label: "Landscape", w: "w-16", h: "h-9" },
];

const DURATIONS = [
  { value: 5 as const, label: "5 seconds", credits: 1, helper: "Best for quick social clips" },
  { value: 10 as const, label: "10 seconds", credits: 2, helper: "Longer shot, higher credit cost" },
];

type VideoDuration = (typeof DURATIONS)[number]["value"];
type VideoRatio = (typeof RATIOS)[number]["v"];
type LatestVideo = {
  url?: string;
  prompt: string;
  requestId?: string;
  generationId?: string;
  status?: string;
};

function VideoPage() {
  useRequireAuth();
  const { user, profile, refreshProfile, session } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState<VideoRatio>("9:16");
  const [duration, setDuration] = useState<VideoDuration>(5);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<LatestVideo | null>(null);
  const pollingRef = useRef<number | null>(null);
  const creditsRequired = duration === 10 ? 2 : 1;

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
      }
    };
  }, []);

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

  const stopPolling = () => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const callVideoFunction = async (fn: "start-video" | "check-video", body: Record<string, unknown>) => {
    const token = session?.access_token;
    if (!token) {
      throw new Error("Please sign in again and retry.");
    }

    const { data, error } = await supabase.functions.invoke(fn, {
      body,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error) {
      throw new Error(error.message || `Failed to call ${fn}`);
    }

    if (data?.error) {
      throw new Error(data.message || data.error);
    }

    return data;
  };

  const pollUntilComplete = async (requestId: string) => {
    try {
      const res = await callVideoFunction("check-video", { request_id: requestId });
      const status = String(res?.status ?? "UNKNOWN");

      if (status === "COMPLETED" && res?.url) {
        stopPolling();
        setBusy(false);
        setLast((prev) => ({
          prompt: prev?.prompt ?? prompt,
          requestId,
          generationId: res?.generation_id,
          status,
          url: res.url,
        }));
        await refreshProfile();
        toast.success("Video ready!");
        return;
      }

      if (status === "FAILED") {
        stopPolling();
        setBusy(false);
        setLast((prev) => ({
          prompt: prev?.prompt ?? prompt,
          requestId,
          generationId: res?.generation_id,
          status,
        }));
        toast.error(res?.message ?? "Video generation failed");
        return;
      }

      setLast((prev) => ({
        prompt: prev?.prompt ?? prompt,
        requestId,
        generationId: res?.generation_id ?? prev?.generationId,
        status,
        url: prev?.url,
      }));
    } catch (e: any) {
      stopPolling();
      setBusy(false);
      toast.error(e?.message ?? "Could not check video status");
    }
  };

  const generate = async () => {
    if (!prompt.trim() || !user) return;
    if (!profile?.unlimited && (profile?.credits ?? 0) < creditsRequired) {
      toast.error(`You need ${creditsRequired} credit${creditsRequired === 1 ? "" : "s"} for this video.`);
      return;
    }

    stopPolling();
    setBusy(true);
    setLast({ prompt, url: undefined, status: "IN_QUEUE" });

    try {
      const res = await callVideoFunction("start-video", {
        prompt,
        aspect_ratio: ratio,
        duration,
      });

      const requestId = String(res?.request_id ?? "");
      if (!requestId) {
        throw new Error("Video request ID missing from backend response.");
      }

      setLast({
        prompt,
        requestId,
        generationId: res?.generation_id,
        status: String(res?.status ?? "IN_QUEUE"),
        url: undefined,
      });
      await refreshProfile();
      await pollUntilComplete(requestId);
      pollingRef.current = window.setInterval(() => {
        void pollUntilComplete(requestId);
      }, 10000);
    } catch (e: any) {
      setBusy(false);
      toast.error(e?.message ?? "Generation failed");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-xl bg-gradient-brand glow-cyan"><Video className="size-5 text-primary-foreground" /></div>
          <div>
            <h1 className="text-3xl font-bold">Video Creator</h1>
            <p className="text-sm text-muted-foreground">Queue a real Kling video, then we auto-check every 10 seconds until it is ready.</p>
          </div>
        </div>

        <GlassCard className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              disabled={busy}
              placeholder="A cinematic shot of a neon-lit Tokyo street at night, rain reflections, slow dolly forward…"
              className="glass-strong w-full resize-none rounded-xl px-4 py-3 outline-none transition focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Aspect ratio</label>
              <div className="flex gap-2">
                {RATIOS.map((r) => (
                  <button
                    key={r.v}
                    type="button"
                    onClick={() => setRatio(r.v)}
                    disabled={busy}
                    className={`glass-strong flex flex-1 flex-col items-center gap-2 rounded-xl p-3 transition disabled:opacity-50 ${
                      ratio === r.v ? "ring-2 ring-ring" : "hover:bg-secondary/60"
                    }`}
                  >
                    <div className={`${r.w} ${r.h} rounded bg-gradient-brand`} />
                    <span className="text-xs">{r.v}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Duration</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {DURATIONS.map((option) => {
                  const selected = duration === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDuration(option.value)}
                      disabled={busy}
                      className={`glass-strong rounded-xl p-3 text-left transition disabled:opacity-50 ${selected ? "ring-2 ring-ring" : "hover:bg-secondary/60"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{option.label}</span>
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Coins className="size-3.5" /> {option.credits}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{option.helper}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="glass-strong flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock3 className="size-4" />
              <span>Queued generation, checked every 10 seconds.</span>
            </div>
            <div className="flex items-center gap-2 font-medium">
              <Coins className="size-4 text-primary" />
              <span>{duration}s video = {creditsRequired} credit{creditsRequired === 1 ? "" : "s"}</span>
            </div>
          </div>

          <button
            disabled={busy || !prompt.trim()}
            onClick={generate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand py-3 font-semibold text-primary-foreground glow-cyan hover:opacity-90 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Generating... checking every 10 seconds
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Generate video ({creditsRequired} credit{creditsRequired === 1 ? "" : "s"})
              </>
            )}
          </button>
        </GlassCard>

        {busy && (
          <GlassCard>
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              <div>
                <p className="font-medium">Generating your video...</p>
                <p className="text-sm text-muted-foreground">Checking every 10 seconds. Kling usually finishes in 2–5 minutes.</p>
              </div>
            </div>
          </GlassCard>
        )}

        {!busy && last?.status === "FAILED" && (
          <GlassCard>
            <h3 className="mb-2 font-semibold">Latest request</h3>
            <p className="mb-1 text-sm text-muted-foreground">{last.prompt}</p>
            <p className="text-sm text-destructive">This video did not finish successfully. Please try again.</p>
          </GlassCard>
        )}

        {!busy && last?.url && (
          <GlassCard>
            <h3 className="mb-2 font-semibold">Latest</h3>
            <p className="mb-1 text-sm text-muted-foreground">{last.prompt}</p>
            <p className="mb-4 text-xs text-muted-foreground">Request ID: {last.requestId}</p>
            <video src={last.url} controls playsInline className="mb-4 w-full rounded-xl bg-background" />
            <button
              onClick={download}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2 font-medium text-primary-foreground"
            >
              <Download className="size-4" /> Download MP4
            </button>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
