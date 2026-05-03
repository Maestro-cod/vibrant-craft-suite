import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useAuth } from "@/lib/auth";
import { generateVoice } from "@/server/audio.functions";
import { Mic, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/voice")({
  head: () => ({ meta: [{ title: "Voice-Over — HyperPost AI" }, { name: "description", content: "Generate lifelike voice-over with ElevenLabs." }] }),
  component: VoicePage,
});

const VOICES = [
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "George — warm male" },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah — soft female" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam — confident male" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", label: "Alice — bright female" },
  { id: "nPczCjzI2devNBz1zQrb", label: "Brian — deep narrator" },
  { id: "cgSgspJ2msm6clMCkdW9", label: "Jessica — energetic female" },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel — authoritative" },
];

function VoicePage() {
  useRequireAuth();
  const { profile, refreshProfile } = useAuth();
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState(VOICES[0].id);
  const [busy, setBusy] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const generate = useServerFn(generateVoice);

  const onGenerate = async () => {
    if (!text.trim()) return;
    if (!profile?.unlimited && (profile?.credits ?? 0) < 1) { toast.error("Out of credits — upgrade your plan."); return; }
    setBusy(true); setAudioUrl(null);
    try {
      const res = await generate({ data: { text, voiceId } });
      setAudioUrl(res.url);
      await refreshProfile();
      toast.success("Voice generated");
    } catch (e: any) {
      toast.error(e?.message ?? "Generation failed");
    } finally { setBusy(false); }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-xl bg-gradient-brand grid place-items-center glow-cyan"><Mic className="size-5 text-background" /></div>
          <div>
            <h1 className="text-3xl font-bold">Voice-Over</h1>
            <p className="text-muted-foreground text-sm">Lifelike voices powered by ElevenLabs.</p>
          </div>
        </div>

        <GlassCard className="space-y-5 gradient-border">
          <div>
            <label className="text-sm font-medium mb-2 block">Voice</label>
            <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-strong outline-none focus:ring-2 focus:ring-[oklch(0.85_0.18_220)]">
              {VOICES.map((v) => <option key={v.id} value={v.id} className="bg-background">{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Script</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} maxLength={2000}
              placeholder="Type what you want spoken…"
              className="w-full px-4 py-3 rounded-xl glass-strong outline-none focus:ring-2 focus:ring-[oklch(0.85_0.18_220)] resize-none" />
            <div className="text-xs text-muted-foreground mt-1 text-right">{text.length}/2000</div>
          </div>
          <button disabled={busy || !text.trim()} onClick={onGenerate}
            className="w-full py-3 rounded-xl bg-gradient-brand text-background font-semibold glow-cyan hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            <Sparkles className={`size-4 ${busy ? "animate-spin" : ""}`} />
            {busy ? <span className="shimmer">Synthesising voice…</span> : "Generate voice (1 credit)"}
          </button>
        </GlassCard>

        {audioUrl && (
          <GlassCard className="space-y-3 animate-fade-up">
            <audio controls src={audioUrl} className="w-full" />
            <a href={audioUrl} download={`voice-${Date.now()}.mp3`} target="_blank" rel="noreferrer"
              className="px-4 py-2 rounded-lg bg-gradient-brand text-background font-medium inline-flex items-center gap-2">
              <Download className="size-4" /> Download MP3
            </a>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
