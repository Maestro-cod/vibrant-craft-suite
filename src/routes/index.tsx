import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Sparkles, Video, Music, Mic, FileText, ArrowRight, Zap, Shield, Download } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HyperPost AI — Create Video, Music, Voice & Scripts with AI" },
      { name: "description", content: "Generate cinematic video, original music, lifelike voice-over and viral scripts. Built for creators. No social posting. Just pure creation." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Video, title: "AI Video", desc: "Cinematic clips in 9:16, 16:9 or 1:1." },
  { icon: Music, title: "AI Music", desc: "Original tracks from a single brief." },
  { icon: Mic, title: "Voice-Over", desc: "Lifelike voices powered by ElevenLabs." },
  { icon: FileText, title: "Scripts", desc: "Hook, beats and CTA in seconds." },
];

function Landing() {
  return (
    <AppShell>
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-8 animate-fade-up">
          <Sparkles className="size-3.5 text-[oklch(0.85_0.18_220)]" />
          <span className="text-xs font-medium">AI-native creator studio</span>
        </div>
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight animate-fade-up">
          Create <span className="text-gradient">anything</span>.<br />
          Post nothing.
        </h1>
        <p className="mt-8 max-w-2xl mx-auto text-lg text-muted-foreground animate-fade-up">
          Generate cinematic video, original music, lifelike voice-over and viral scripts —
          download instantly, post wherever you want.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-fade-up">
          <Link to="/auth" className="px-6 py-3 rounded-xl bg-gradient-brand text-background font-semibold glow-cyan inline-flex items-center gap-2 hover:opacity-90">
            Start creating <ArrowRight className="size-4" />
          </Link>
          <Link to="/pricing" className="px-6 py-3 rounded-xl glass font-semibold hover:bg-white/10">
            See pricing
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass rounded-2xl p-6 hover:bg-white/[0.07] transition group">
              <div className="size-12 rounded-xl bg-gradient-brand grid place-items-center mb-4 group-hover:glow-cyan transition">
                <Icon className="size-5 text-background" />
              </div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Zap, title: "Instant", desc: "Generations stream in seconds." },
            { icon: Download, title: "Yours forever", desc: "Every output has a download button." },
            { icon: Shield, title: "No socials", desc: "We never post for you. You own the moment." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass rounded-2xl p-6">
              <Icon className="size-5 text-[oklch(0.65_0.25_295)] mb-3" />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
