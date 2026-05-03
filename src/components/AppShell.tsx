import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, LayoutDashboard, Video, Music, Mic, FileText, CreditCard, LogOut, Sparkles, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AnimatedBg } from "./AnimatedBg";
import { CreditMeter } from "./CreditMeter";
import { Footer } from "./Footer";
import type { ReactNode } from "react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/video", label: "Video", icon: Video },
  { to: "/music", label: "Music", icon: Music },
  { to: "/voice", label: "Voice", icon: Mic },
  { to: "/script", label: "Script", icon: FileText },
  { to: "/pricing", label: "Pricing", icon: CreditCard },
] as const;

const MOBILE_NAV = NAV.slice(0, 5);

export function AppShell({ children, hideFooter = false }: { children: ReactNode; hideFooter?: boolean }) {
  const { user, profile, signOut } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const isAdmin = profile?.email === "stefanmaestro25@gmail.com";

  return (
    <div className="min-h-screen flex flex-col">
      <AnimatedBg />
      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 pt-3">
          <div className="glass-strong rounded-2xl h-14 px-3 sm:px-4 flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2 font-bold">
              <div className="size-8 rounded-lg bg-gradient-brand grid place-items-center glow-cyan">
                <Sparkles className="size-4 text-background" />
              </div>
              <span className="text-gradient hidden xs:inline sm:inline">HyperPost AI</span>
            </Link>

            <nav className="hidden md:flex items-center gap-0.5">
              {NAV.map(({ to, label, icon: Icon }) => {
                const active = loc.pathname === to;
                return (
                  <Link key={to} to={to}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition ${active ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
                    <Icon className="size-4" />{label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link to="/admin" className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition ${loc.pathname === "/admin" ? "bg-white/10" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
                  <Shield className="size-4" />Admin
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <CreditMeter />
                  <button onClick={async () => { await signOut(); nav({ to: "/" }); }}
                    className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground" aria-label="Sign out">
                    <LogOut className="size-4" />
                  </button>
                </>
              ) : (
                <Link to="/auth" className="px-4 py-1.5 rounded-lg bg-gradient-brand text-background font-semibold text-sm glow-cyan hover:opacity-90 transition">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-8">{children}</main>

      {!hideFooter && <Footer />}

      {/* Mobile bottom tabs */}
      {user && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-white/10">
          <div className="grid grid-cols-5 px-1 py-1.5">
            {MOBILE_NAV.map(({ to, label, icon: Icon }) => {
              const active = loc.pathname === to;
              return (
                <Link key={to} to={to} className={`flex flex-col items-center gap-0.5 py-2 rounded-lg text-[10px] transition ${active ? "text-foreground" : "text-muted-foreground"}`}>
                  <Icon className={`size-5 ${active ? "text-[oklch(0.85_0.18_220)]" : ""}`} />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
