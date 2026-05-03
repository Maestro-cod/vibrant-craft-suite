import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Music, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/music")({
  head: () => ({ meta: [{ title: "AI Music — HyperPost AI" }, { name: "description", content: "Generate original music tracks from a brief." }] }),
  component: MusicPage,
});

function MusicPage() {
  useRequireAuth();
  const { user, profile, refreshProfile } = useAuth();
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ url?: string; prompt: string } | null>(null);

  const generate = async () => {
    if (!brief.trim() || !user) return;
    if (!profile?.unlimited && (profile?.credits ?? 0) < 1) { toast.error("Out of credits."); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.from("generations").insert({
        user_id: user.id, type: "music", prompt: brief,
      }).select().single();
      if (error) throw error;
      if (!profile?.unlimited) await supabase.from("profiles").update({ credits: (profile?.credits ?? 1) - 1 }).eq("id", user.id);
      await refreshProfile();
      setLast({ prompt: brief, url: data.output_url ?? undefined });
      toast.success("Saved. Music engine wiring coming soon.");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-xl bg-gradient-brand grid place-items-center glow-violet"><Music className="size-5 text-background" /></div>
          <div>
            <h1 className="text-3xl font-bold">AI Music</h1>
            <p className="text-muted-foreground text-sm">Describe a mood, genre or reference. Get a track.</p>
          </div>
        </div>

        <GlassCard className="space-y-5">
          <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={5}
            placeholder="Dark synthwave with deep bass, 110 BPM, cinematic build, 30 seconds…"
            className="w-full px-4 py-3 rounded-xl glass-strong outline-none focus:ring-2 focus:ring-[oklch(0.65_0.25_295)] resize-none" />
          <button disabled={busy || !brief.trim()} onClick={generate}
            className="w-full py-3 rounded-xl bg-gradient-brand text-background font-semibold glow-violet hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            <Sparkles className="size-4" /> {busy ? "Composing…" : "Generate music (1 credit)"}
          </button>
        </GlassCard>

        {last && (
          <GlassCard>
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
