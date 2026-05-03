import { useAuth } from "@/lib/auth";
import { Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function CreditMeter() {
  const { profile } = useAuth();
  if (!profile) return null;
  if (profile.unlimited) {
    return (
      <Link
        to="/pricing"
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs hover:bg-white/10"
      >
        <Sparkles className="size-3 text-[oklch(0.85_0.18_220)]" />
        <span className="font-bold text-gradient">Elite ∞</span>
      </Link>
    );
  }
  const max = profile.monthly_credits || 3;
  const pct = Math.max(0, Math.min(100, (profile.credits / max) * 100));
  return (
    <Link
      to="/pricing"
      className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full glass text-xs group hover:bg-white/10"
    >
      <span className="text-muted-foreground">Credits</span>
      <span className="font-bold text-gradient">{profile.credits}</span>
      <span className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <span className="block h-full bg-gradient-brand" style={{ width: `${pct}%` }} />
      </span>
    </Link>
  );
}
