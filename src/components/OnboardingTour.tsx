import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Sparkles, X, Video, Music, Mic, FileText } from "lucide-react";

const KEY = "hp_onboarded_v1";

export function OnboardingTour() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEY)) return;
    setOpen(true);
  }, [user]);

  const close = () => {
    localStorage.setItem(KEY, "1");
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-strong rounded-3xl max-w-lg w-full p-8 relative gradient-border">
        <button
          onClick={close}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        <div className="size-12 rounded-xl bg-gradient-brand grid place-items-center glow-cyan mb-4">
          <Sparkles className="size-5 text-background" />
        </div>
        <h2 className="text-2xl font-bold">
          Welcome to <span className="text-gradient">HyperPost AI</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          You have <span className="text-foreground font-semibold">3 free credits</span>. Each
          generation costs 1 credit. Pick a tool to get started:
        </p>
        <div className="grid grid-cols-2 gap-2 mt-5">
          {[
            { to: "/video", label: "Cinematic video", icon: Video },
            { to: "/music", label: "Original music", icon: Music },
            { to: "/voice", label: "Lifelike voice", icon: Mic },
            { to: "/script", label: "Viral scripts", icon: FileText },
          ].map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={close}
              className="glass rounded-xl p-3 text-sm flex items-center gap-2 hover:bg-white/10 transition"
            >
              <Icon className="size-4 text-[oklch(0.85_0.18_220)]" /> {label}
            </Link>
          ))}
        </div>
        <button
          onClick={close}
          className="mt-5 w-full py-2.5 rounded-xl bg-gradient-brand text-background font-semibold hover:opacity-90"
        >
          Let's go
        </button>
      </div>
    </div>
  );
}
