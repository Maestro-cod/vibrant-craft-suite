import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { createCheckout, openBillingPortal } from "@/server/stripe.functions";
import { Check, Sparkles, Settings } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Pricing — HyperPost AI" }, { name: "description", content: "Simple, credit-based pricing for HyperPost AI." }] }),
  component: PricingPage,
});

const TIERS = [
  { id: "free",  name: "Free",  price: "$0",  period: "forever", credits: "3 credits",        features: ["Try every tool", "All download formats", "Community support"], highlight: false },
  { id: "basic", name: "Basic", price: "$12", period: "/month",  credits: "100 credits / mo", features: ["Everything in Free", "Standard generation queue", "Email support"], highlight: false },
  { id: "pro",   name: "Pro",   price: "$35", period: "/month",  credits: "400 credits / mo", features: ["Everything in Basic", "Priority generation", "Premium voices"], highlight: true  },
  { id: "elite", name: "Elite", price: "$59", period: "/month",  credits: "1,000 credits / mo", features: ["Everything in Pro", "Highest priority", "Early access to new models"], highlight: false },
] as const;

function PricingPage() {
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const checkout = useServerFn(createCheckout);
  const portal = useServerFn(openBillingPortal);

  const subscribe = async (plan: "basic" | "pro" | "elite") => {
    if (!user) { window.location.href = "/auth"; return; }
    setBusy(plan);
    try {
      const r = await checkout({ data: { plan } });
      if (r.url) window.location.href = r.url;
    } catch (e: any) {
      toast.error(e?.message ?? "Checkout failed");
    } finally { setBusy(null); }
  };

  const manage = async () => {
    setBusy("portal");
    try {
      const r = await portal();
      if (r.url) window.location.href = r.url;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open billing portal");
    } finally { setBusy(null); }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-24">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-6">
            <Sparkles className="size-3.5 text-[oklch(0.85_0.18_220)]" />
            <span className="text-xs font-medium">Pricing</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold">Simple <span className="text-gradient">credit</span> pricing</h1>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">1 credit = 1 generation. Cancel any time.</p>
          {profile?.plan && profile.plan !== "free" && !profile.unlimited && (
            <button onClick={manage} disabled={busy === "portal"}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-strong hover:bg-white/10 text-sm font-medium">
              <Settings className="size-4" /> Manage subscription
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map((t) => {
            const isCurrent = profile?.plan === t.id || (profile?.unlimited && t.id === "elite");
            const isPaid = t.id !== "free";
            return (
              <div key={t.id} className={`rounded-2xl p-6 flex flex-col ${t.highlight ? "glass-strong ring-2 ring-[oklch(0.85_0.18_220)] glow-cyan" : "glass"}`}>
                {t.highlight && <div className="text-xs font-bold text-gradient mb-2">MOST POPULAR</div>}
                <h3 className="text-xl font-bold">{t.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{t.price}</span>
                  <span className="text-sm text-muted-foreground">{t.period}</span>
                </div>
                <div className="text-sm text-[oklch(0.85_0.18_220)] mt-1 font-medium">{t.credits}</div>

                <ul className="mt-6 space-y-2.5 text-sm flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="size-4 text-[oklch(0.85_0.18_220)] shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={isCurrent || busy === t.id}
                  onClick={() => isPaid ? subscribe(t.id as "basic" | "pro" | "elite") : (window.location.href = "/auth")}
                  className={`mt-6 py-2.5 rounded-xl font-semibold transition disabled:opacity-50 ${t.highlight ? "bg-gradient-brand text-background hover:opacity-90" : "glass-strong hover:bg-white/10"}`}>
                  {isCurrent ? "Current plan" : busy === t.id ? "Loading…" : isPaid ? `Choose ${t.name}` : "Get started"}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">All plans are monthly. Credits reset on billing date. Secure checkout via Stripe.</p>
      </div>
    </AppShell>
  );
}
