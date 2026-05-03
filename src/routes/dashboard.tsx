import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { OnboardingTour } from "@/components/OnboardingTour";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Video, Music, Mic, FileText, Download, Trash2, Plus, TrendingUp, Activity, Coins } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — HyperPost AI" }] }),
  component: Dashboard,
});

type Gen = {
  id: string;
  type: "video"|"music"|"voiceover"|"script";
  prompt: string;
  output_url: string | null;
  output_text: string | null;
  created_at: string;
  metadata?: { status?: string } | null;
};

const ICON = { video: Video, music: Music, voiceover: Mic, script: FileText };
const LABEL = { video: "Video", music: "Music", voiceover: "Voice-Over", script: "Script" };

const TILES = [
  { to: "/video", label: "New Video", desc: "Cinematic clips, 9:16 / 16:9 / 1:1", icon: Video, span: "sm:col-span-2", glow: "glow-cyan" },
  { to: "/music", label: "New Music", desc: "Brief → track", icon: Music, span: "", glow: "glow-violet" },
  { to: "/voice", label: "New Voice-Over", desc: "ElevenLabs voices", icon: Mic, span: "", glow: "glow-cyan" },
  { to: "/script", label: "New Script", desc: "Hook → beats → CTA", icon: FileText, span: "sm:col-span-2", glow: "glow-violet" },
] as const;

function Dashboard() {
  useRequireAuth();
  const { profile, user } = useAuth();
  const [gens, setGens] = useState<Gen[]>([]);
  const [filter, setFilter] = useState<"all" | Gen["type"]>("all");

  useEffect(() => {
    if (!user) return;
    supabase.from("generations").select("*").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setGens((data ?? []) as Gen[]));
  }, [user]);

  // ?checkout=success toast
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("checkout") === "success") {
      toast.success("Subscription active — credits added.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const thisWeek = new Date(); thisWeek.setDate(thisWeek.getDate() - 7);
    return {
      total: gens.length,
      today: gens.filter(g => new Date(g.created_at) >= today).length,
      week: gens.filter(g => new Date(g.created_at) >= thisWeek).length,
    };
  }, [gens]);

  const filtered = filter === "all" ? gens : gens.filter(g => g.type === filter);

  const remove = async (id: string) => {
    await supabase.from("generations").delete().eq("id", id);
    setGens((g) => g.filter((x) => x.id !== id));
    toast.success("Deleted");
  };

  const download = async (g: Gen) => {
    if (g.output_url) {
      const ext = g.type === "video" ? "mp4" : "mp3";
      const filename = `${g.type}-${g.id.slice(0,6)}.${ext}`;
      try {
        const res = await fetch(g.output_url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) {
        console.error("[download] failed", e);
        toast.error("Download failed — opening in new tab");
        window.open(g.output_url, "_blank");
      }
    } else if (g.output_text) {
      const blob = new Blob([g.output_text], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${g.type}-${g.id.slice(0,6)}.txt`;
      a.click();
    } else {
      toast.message("Nothing to download yet");
    }
  };

  return (
    <AppShell>
      <OnboardingTour />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
          <p className="text-muted-foreground mt-1">
            {profile?.unlimited ? "Unlimited Elite access" : `${profile?.credits ?? 0} credits • ${profile?.plan ?? "free"} plan`}
          </p>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total made", value: stats.total, icon: Activity },
            { label: "This week", value: stats.week, icon: TrendingUp },
            { label: profile?.unlimited ? "Plan" : "Credits left", value: profile?.unlimited ? "Elite ∞" : (profile?.credits ?? 0), icon: Coins },
          ].map(({ label, value, icon: Icon }) => (
            <GlassCard key={label} className="p-4 sm:p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-3.5" /> {label}</div>
              <div className="text-2xl sm:text-3xl font-bold mt-1">{value}</div>
            </GlassCard>
          ))}
        </div>

        {/* Bento creator tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TILES.map(({ to, label, desc, icon: Icon, span, glow }) => (
            <Link key={to} to={to} className={`glass rounded-2xl p-6 lift gradient-border group ${span}`}>
              <div className="flex items-start justify-between">
                <div className={`size-12 rounded-xl bg-gradient-brand grid place-items-center group-hover:${glow} transition`}>
                  <Icon className="size-5 text-background" />
                </div>
                <Plus className="size-4 text-muted-foreground group-hover:text-foreground" />
              </div>
              <div className="mt-6 font-semibold text-lg">{label}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{desc}</div>
            </Link>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="text-xl font-semibold">Recent generations</h2>
            <div className="flex gap-1.5 glass rounded-full p-1">
              {(["all","video","music","voiceover","script"] as const).map(t => (
                <button key={t} onClick={() => setFilter(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition ${filter === t ? "bg-gradient-brand text-background" : "text-muted-foreground hover:text-foreground"}`}>
                  {t === "voiceover" ? "voice" : t}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <GlassCard className="text-center py-16 text-muted-foreground">
              {gens.length === 0 ? "No generations yet. Pick a tool above to start." : "Nothing matches that filter."}
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((g) => {
                const Icon = ICON[g.type];
                const isAudio = (g.type === "music" || g.type === "voiceover") && g.output_url;
                const isPendingVideo = g.type === "video" && !g.output_url && g.metadata?.status && g.metadata.status !== "FAILED";
                return (
                  <GlassCard key={g.id} className="p-5 flex flex-col gap-3 lift">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Icon className="size-4 text-primary" />
                      <span className="uppercase tracking-wider font-semibold">{LABEL[g.type]}</span>
                      <span className="ml-auto">{new Date(g.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm line-clamp-3">{g.prompt}</p>
                    {isPendingVideo && <p className="text-xs text-muted-foreground">Video queued — still generating.</p>}
                    {g.type === "video" && g.output_url && <video src={g.output_url} controls playsInline className="w-full rounded-lg bg-background" />}
                    {isAudio && <audio controls src={g.output_url!} className="w-full h-9" />}
                    <div className="flex gap-2 mt-auto pt-2">
                      <button onClick={() => download(g)} className="flex-1 py-2 rounded-lg bg-gradient-brand text-primary-foreground text-sm font-medium flex items-center justify-center gap-1.5 hover:opacity-90">
                        <Download className="size-3.5" /> Download
                      </button>
                      <button onClick={() => remove(g.id)} className="p-2 rounded-lg glass-strong hover:bg-white/10" aria-label="Delete">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
