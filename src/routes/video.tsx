import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
  {
    value: 10 as const,
    label: "10 seconds",
    credits: 2,
    helper: "Longer shot, higher credit cost",
  },
];

type VideoDuration = (typeof DURATIONS)[number]["value"];
type VideoRatio = (typeof RATIOS)[number]["v"];
type LatestVideo = {
  url?: string;
  prompt: string;
  requestId?: string;
  generationId?: string;
  status?: string;
  errorMessage?: string;
};

const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 72; // 72 × 10s = 12 min
const MAX_POLL_DURATION_MS = MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS;
const ACTIVE_REQUEST_KEY = "hyperpost:active_video_request";

type StoredRequest = {
  requestId: string;
  prompt: string;
  startedAt: number;
};

function loadStoredRequest(): StoredRequest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_REQUEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRequest;
    if (!parsed?.requestId) return null;
    if (Date.now() - parsed.startedAt > MAX_POLL_DURATION_MS) {
      window.localStorage.removeItem(ACTIVE_REQUEST_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveStoredRequest(req: StoredRequest | null) {
  if (typeof window === "undefined") return;
  try {
    if (req) window.localStorage.setItem(ACTIVE_REQUEST_KEY, JSON.stringify(req));
    else window.localStorage.removeItem(ACTIVE_REQUEST_KEY);
  } catch {
    /* ignore */
  }
}

function VideoPage() {
  useRequireAuth();
  const { user, profile, refreshProfile, session } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState<VideoRatio>("9:16");
  const [duration, setDuration] = useState<VideoDuration>(5);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<LatestVideo | null>(null);
  const pollingRef = useRef<number | null>(null);
  const pollStartRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);
  const consecutiveErrorsRef = useRef<number>(0);

  const creditsRequired = duration === 10 ? 2 : 1;
  const isAdminEmail = user?.email?.toLowerCase() === "stefanmaestro25@gmail.com";

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    pollStartRef.current = 0;
    consecutiveErrorsRef.current = 0;
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
    };
  }, []);

  const callVideoFunction = useCallback(
    async (fn: "start-video" | "check-video", body: Record<string, unknown>) => {
      // Always grab a fresh session — the cached one may be expired.
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? session?.access_token;
      if (!token) throw new Error("Please sign in again and retry.");

      const { data, error } = await supabase.functions.invoke(fn, {
        body,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw new Error(error.message || `Failed to call ${fn}`);
      if (data?.error) throw new Error(data.message || data.error);
      return data;
    },
    [session?.access_token],
  );

  const pollUntilComplete = useCallback(
    async (requestId: string, promptText: string) => {
      // Re-entrancy guard so overlapping intervals can't double-call.
      if (inFlightRef.current) return "PENDING";
      inFlightRef.current = true;

      try {
        // Hard timeout safety net (server also enforces, but guard the UI).
        if (pollStartRef.current && Date.now() - pollStartRef.current > MAX_POLL_DURATION_MS) {
          stopPolling();
          setBusy(false);
          saveStoredRequest(null);
          setLast({
            prompt: promptText,
            requestId,
            status: "FAILED",
            errorMessage: "Video timed out. If credits were charged, they were refunded.",
          });
          toast.error("Video timed out — please try again.");
          return "FAILED";
        }

        const res = await callVideoFunction("check-video", { request_id: requestId });
        consecutiveErrorsRef.current = 0;
        const status = String(res?.status ?? "UNKNOWN");

        if (status === "COMPLETED" && res?.url) {
          stopPolling();
          setBusy(false);
          saveStoredRequest(null);
          setLast({
            prompt: promptText,
            requestId,
            generationId: res?.generation_id,
            status,
            url: res.url,
          });
          await refreshProfile();
          toast.success("Video ready!");
          return status;
        }

        if (status === "FAILED") {
          stopPolling();
          setBusy(false);
          saveStoredRequest(null);
          setLast({
            prompt: promptText,
            requestId,
            generationId: res?.generation_id,
            status,
            errorMessage: res?.message,
          });
          await refreshProfile();
          toast.error(res?.message ?? "Video generation failed");
          return status;
        }

        // Still in progress — update UI but keep polling.
        setLast((prev) => ({
          prompt: promptText,
          requestId,
          generationId: res?.generation_id ?? prev?.generationId,
          status,
          url: prev?.url,
        }));
        return status;
      } catch (e) {
        consecutiveErrorsRef.current += 1;
        // Tolerate up to 5 consecutive transient errors before giving up the UI.
        if (consecutiveErrorsRef.current >= 5) {
          stopPolling();
          setBusy(false);
          toast.error(
            e instanceof Error
              ? e.message
              : "Could not check video status. Refresh to resume tracking.",
          );
          return "FAILED";
        }
        // Otherwise just log and let the next interval tick try again.
        console.warn("[video] transient check error", e);
        return "PENDING";
      } finally {
        inFlightRef.current = false;
      }
    },
    [callVideoFunction, refreshProfile, stopPolling],
  );

  const startPolling = useCallback(
    (requestId: string, promptText: string) => {
      stopPolling();
      pollStartRef.current = Date.now();
      consecutiveErrorsRef.current = 0;
      pollingRef.current = window.setInterval(() => {
        void pollUntilComplete(requestId, promptText);
      }, POLL_INTERVAL_MS);
    },
    [pollUntilComplete, stopPolling],
  );

  // Resume any in-progress request after a refresh / tab close.
  useEffect(() => {
    if (!user) return;
    const stored = loadStoredRequest();
    if (!stored) return;
    setBusy(true);
    setLast({ prompt: stored.prompt, requestId: stored.requestId, status: "IN_PROGRESS" });
    void (async () => {
      const initial = await pollUntilComplete(stored.requestId, stored.prompt);
      if (initial !== "COMPLETED" && initial !== "FAILED") {
        startPolling(stored.requestId, stored.prompt);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const download = async () => {
    if (!last?.url) return;
    try {
      const res = await fetch(last.url, { mode: "cors" });
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `hyperpost-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
    } catch {
      const sep = last.url.includes("?") ? "&" : "?";
      const a = document.createElement("a");
      a.href = `${last.url}${sep}download=hyperpost-${Date.now()}.mp4`;
      a.download = `hyperpost-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  const generate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || !user) return;
    if (trimmed.length < 3) {
      toast.error("Prompt must be at least 3 characters.");
      return;
    }
    if (trimmed.length > 2000) {
      toast.error("Prompt is too long (max 2000 characters).");
      return;
    }
    if (busy) return; // prevent double-submit
    if (!isAdminEmail && !profile?.unlimited && (profile?.credits ?? 0) < creditsRequired) {
      toast.error(
        `You need ${creditsRequired} credit${creditsRequired === 1 ? "" : "s"} for this video.`,
      );
      return;
    }

    stopPolling();
    setBusy(true);
    setLast({ prompt: trimmed, url: undefined, status: "IN_QUEUE" });

    try {
      const res = await callVideoFunction("start-video", {
        prompt: trimmed,
        aspect_ratio: ratio,
        duration,
      });

      const requestId = String(res?.request_id ?? "");
      if (!requestId) throw new Error("Video request ID missing from backend response.");

      saveStoredRequest({ requestId, prompt: trimmed, startedAt: Date.now() });
      setLast({
        prompt: trimmed,
        requestId,
        generationId: res?.generation_id,
        status: String(res?.status ?? "IN_QUEUE"),
        url: undefined,
      });
      await refreshProfile();

      const initialStatus = await pollUntilComplete(requestId, trimmed);
      if (initialStatus !== "COMPLETED" && initialStatus !== "FAILED") {
        startPolling(requestId, trimmed);
      }
    } catch (e) {
      setBusy(false);
      saveStoredRequest(null);
      const message = e instanceof Error ? e.message : "Generation failed";
      toast.error(message);
      setLast({ prompt: trimmed, status: "FAILED", errorMessage: message });
      await refreshProfile(); // in case server refunded
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-xl bg-gradient-brand glow-cyan">
            <Video className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Video Creator</h1>
            <p className="text-sm text-muted-foreground">
              Queue a real Kling video, then we auto-check every 10 seconds until it is ready.
            </p>
          </div>
        </div>

        <GlassCard className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              maxLength={2000}
              disabled={busy}
              placeholder="A cinematic shot of a neon-lit Tokyo street at night, rain reflections, slow dolly forward…"
              className="glass-strong w-full resize-none rounded-xl px-4 py-3 outline-none transition focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
            <div className="mt-1 text-right text-xs text-muted-foreground">
              {prompt.length}/2000
            </div>
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
              <span>
                {duration}s video = {creditsRequired} credit{creditsRequired === 1 ? "" : "s"}
              </span>
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
                <Sparkles className="size-4" /> Generate video ({creditsRequired} credit
                {creditsRequired === 1 ? "" : "s"})
              </>
            )}
          </button>
        </GlassCard>

        {busy && (
          <GlassCard>
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              <div>
                <p className="font-medium">Generating your video... this takes 1-2 minutes</p>
                <p className="text-sm text-muted-foreground">
                  We auto-check every 10 seconds and show it here when ready. Safe to leave this
                  page — we'll resume tracking when you come back.
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {!busy && last?.status === "FAILED" && (
          <GlassCard>
            <h3 className="mb-2 font-semibold">Latest request</h3>
            <p className="mb-1 text-sm text-muted-foreground">{last.prompt}</p>
            <p className="text-sm text-destructive">
              {last.errorMessage ?? "This video did not finish successfully. Please try again."}
            </p>
          </GlassCard>
        )}

        {!busy && last?.url && (
          <GlassCard>
            <h3 className="mb-2 font-semibold">Latest</h3>
            <p className="mb-1 text-sm text-muted-foreground">{last.prompt}</p>
            <p className="mb-4 text-xs text-muted-foreground">Request ID: {last.requestId}</p>
            <video
              src={last.url}
              controls
              playsInline
              className="mb-4 w-full rounded-xl bg-background"
            />
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
