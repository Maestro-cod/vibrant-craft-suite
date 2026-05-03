import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Video, Music, Mic, FileText, Download, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — HyperPost AI" }] }),
  component: Dashboard,
});

type Gen = {
  id: string; type: "video"|"music"|"voiceover"|"script";
  prompt: string; output_url: string | null; output_text: string | null; created_at: string;
};

const ICON = { video: Video, music: Music, voiceover: Mic, script: FileText };
const TILES = [
  { to: "/video", label: "New Video", icon: Video, span: "sm:col-span-2" },
  { to: "/music", label: "New Music", icon: Music, span: "" },
  { to: "/voice", label: "New Voice-Over", icon: Mic, span: "" },
  { to: "/script", label: "New Script", icon: FileText, span: "sm:col-span-2" },
] as const;

function Dashboard() {
  useRequireAuth();
  const { profile, user } = useAuth();
  const [gens, setGens] = useState<Gen[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("generations").select("*").order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setGens((data ?? []) as Gen[]));
  }, [user]);

  const remove = async (id: string) => {
    await supabase.from("generations").delete().eq("id", id);
    setGens((g) => g.filter((x) => x.id !== id));
    toast.success("Deleted");
  };

  const download = (g: Gen) => {
    if (g.output_url) window.open(g.output_url, "_blank");
    else if (g.output_text) {
      const blob = new Blob([g.output_text], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${g.type}-${g.id.slice(0,6)}.txt`;
      a.click();
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
          <p className="text-muted-foreground mt-1">
            {profile?.unlimited ? "Unlimited Elite access" : `${profile?.credits ?? 0} credits • ${profile?.plan ?? "free"} plan`}
          </p>
        </div>

        {/* Bento */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TILES.map(({ to, label, icon: Icon, span }) => (
            <Link key={to} to={to} className={`glass rounded-2xl p-6 hover:bg-white/[0.07] transition group ${span}`}>
              <div className="flex items-start justify-between">
                <div className="size-12 rounded-xl bg-gradient-brand grid place-items-center group-hover:glow-cyan transition">
                  <Icon className="size-5 text-background" />
                </div>
                <Plus className="size-4 text-muted-foreground group-hover:text-foreground" />
              </div>
              <div className="mt-6 font-semibold">{label}</div>
            </Link>
          ))}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Recent generations</h2>
          {gens.length === 0 ? (
            <GlassCard className="text-center py-16 text-muted-foreground">No generations yet. Pick a tool above to start.</GlassCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gens.map((g) => {
                const Icon = ICON[g.type];
                return (
                  <GlassCard key={g.id} className="p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Icon className="size-4 text-[oklch(0.85_0.18_220)]" />
                      <span className="uppercase tracking-wider">{g.type}</span>
                      <span className="ml-auto">{new Date(g.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm line-clamp-3">{g.prompt}</p>
                    <div className="flex gap-2 mt-auto pt-2">
                      <button onClick={() => download(g)} className="flex-1 py-2 rounded-lg bg-gradient-brand text-background text-sm font-medium flex items-center justify-center gap-1.5 hover:opacity-90">
                        <Download className="size-3.5" /> Download
                      </button>
                      <button onClick={() => remove(g.id)} className="p-2 rounded-lg glass-strong hover:bg-white/10 text-muted-foreground hover:text-destructive">
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
