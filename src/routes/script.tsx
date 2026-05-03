import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { generateScript } from "@/server/script.functions";
import { FileText, Sparkles, Download, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/script")({
  head: () => ({ meta: [{ title: "Script Generator — HyperPost AI" }, { name: "description", content: "Generate viral short-form video scripts." }] }),
  component: ScriptPage,
});

function ScriptPage() {
  useRequireAuth();
  const { user, profile, refreshProfile } = useAuth();
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [script, setScript] = useState("");

  const generate = async () => {
    if (!topic.trim() || !user) return;
    if (!profile?.unlimited && (profile?.credits ?? 0) < 1) { toast.error("Out of credits."); return; }
    setBusy(true); setScript("");
    try {
      const { text } = await generateScript({ data: { topic } });
      setScript(text);
      await supabase.from("generations").insert({ user_id: user.id, type: "script", prompt: topic, output_text: text });
      if (!profile?.unlimited) await supabase.from("profiles").update({ credits: (profile?.credits ?? 1) - 1 }).eq("id", user.id);
      await refreshProfile();
    } catch (e: any) { toast.error(e.message ?? "Failed"); } finally { setBusy(false); }
  };

  const download = () => {
    const blob = new Blob([script], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `script-${Date.now()}.txt`; a.click();
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-24 space-y-6">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-xl bg-gradient-brand grid place-items-center glow-violet"><FileText className="size-5 text-background" /></div>
          <div>
            <h1 className="text-3xl font-bold">Script Generator</h1>
            <p className="text-muted-foreground text-sm">Hook → beats → CTA. In seconds.</p>
          </div>
        </div>

        <GlassCard className="space-y-4">
          <input value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic (e.g. 'Why most beginner traders blow up their accounts')"
            className="w-full px-4 py-3 rounded-xl glass-strong outline-none focus:ring-2 focus:ring-[oklch(0.65_0.25_295)]" />
          <button disabled={busy || !topic.trim()} onClick={generate}
            className="w-full py-3 rounded-xl bg-gradient-brand text-background font-semibold glow-violet hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2">
            <Sparkles className="size-4" /> {busy ? "Writing…" : "Generate script (1 credit)"}
          </button>
        </GlassCard>

        {script && (
          <GlassCard className="space-y-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{script}</pre>
            <div className="flex gap-2">
              <button onClick={download} className="px-4 py-2 rounded-lg bg-gradient-brand text-background font-medium inline-flex items-center gap-2">
                <Download className="size-4" /> Download
              </button>
              <button onClick={() => { navigator.clipboard.writeText(script); toast.success("Copied"); }}
                className="px-4 py-2 rounded-lg glass-strong hover:bg-white/10 font-medium inline-flex items-center gap-2">
                <Copy className="size-4" /> Copy
              </button>
            </div>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
