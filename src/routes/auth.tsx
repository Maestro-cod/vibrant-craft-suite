import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — HyperPost AI" }, { name: "description", content: "Sign in or create your HyperPost AI account." }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const onGoogle = async () => {
    setLoading(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (r.error) { toast.error(r.error.message ?? "Sign-in failed"); setLoading(false); return; }
    if (r.redirected) return;
    nav({ to: "/dashboard" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Account created!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      nav({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally { setLoading(false); }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-md px-4 sm:px-6 pt-16">
        <GlassCard className="p-8">
          <div className="text-center mb-6">
            <div className="size-12 rounded-xl bg-gradient-brand grid place-items-center mx-auto mb-4 glow-violet">
              <Sparkles className="size-5 text-background" />
            </div>
            <h1 className="text-2xl font-bold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
            <p className="text-sm text-muted-foreground mt-1">3 free credits to get started.</p>
          </div>

          <button onClick={onGoogle} disabled={loading}
            className="w-full py-2.5 rounded-xl glass-strong hover:bg-white/10 font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            <svg viewBox="0 0 48 48" className="size-5"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.3c-2 1.4-4.6 2.3-7.5 2.3-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.5 5.3c-.5.4 6.7-4.9 6.7-14.8 0-1.3-.1-2.3-.4-3.5z"/></svg>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px bg-border flex-1" /> or <div className="h-px bg-border flex-1" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full px-4 py-2.5 rounded-xl glass-strong outline-none focus:ring-2 focus:ring-[oklch(0.85_0.18_220)]" />
            )}
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-2.5 rounded-xl glass-strong outline-none focus:ring-2 focus:ring-[oklch(0.85_0.18_220)]" />
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-2.5 rounded-xl glass-strong outline-none focus:ring-2 focus:ring-[oklch(0.85_0.18_220)]" />
            <button disabled={loading} className="w-full py-2.5 rounded-xl bg-gradient-brand text-background font-semibold glow-cyan hover:opacity-90 disabled:opacity-50">
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground w-full text-center">
            {mode === "signin" ? "No account? Sign up" : "Already have an account? Sign in"}
          </button>
        </GlassCard>
      </div>
    </AppShell>
  );
}
