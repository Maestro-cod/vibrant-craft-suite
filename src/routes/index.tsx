import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Reveal } from "@/components/Reveal";
import { Sparkles, Video, Music, Mic, FileText, ArrowRight, Zap, Shield, Download, Wand2, Star } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HyperPost AI — Create Video, Music, Voice & Scripts with AI" },
      { name: "description", content: "Generate cinematic video, original music, lifelike voice-over and viral scripts. Built for creators. No social posting. Just pure creation." },
      { property: "og:title", content: "HyperPost AI — All your AI creation in one studio" },
      { property: "og:description", content: "Cinematic video, original music, lifelike voice & viral scripts. Download instantly. Post anywhere." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Video, title: "AI Video", desc: "Cinematic clips in 9:16, 16:9 or 1:1.", to: "/video" },
  { icon: Music, title: "AI Music", desc: "Original tracks from a single brief.", to: "/music" },
  { icon: Mic,   title: "Voice-Over", desc: "Lifelike voices powered by ElevenLabs.", to: "/voice" },
  { icon: FileText, title: "Scripts", desc: "Hook, beats and CTA in seconds.", to: "/script" },
];

const STEPS = [
  { n: 1, title: "Describe it", desc: "One sentence is enough. Pick a tool, type a prompt." },
  { n: 2, title: "Generate", desc: "Our pipeline streams a result in seconds." },
  { n: 3, title: "Download", desc: "Every output has a download button. Yours forever." },
];

function Landing() {
  return (
    <AppShell>
      {/* HERO */}
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
          <Link to="/auth" className="px-6 py-3 rounded-xl bg-gradient-brand text-background font-semibold glow-cyan inline-flex items-center gap-2 hover:opacity-90 lift">
            Start creating free <ArrowRight className="size-4" />
          </Link>
          <Link to="/pricing" className="px-6 py-3 rounded-xl glass font-semibold hover:bg-white/10">
            See pricing
          </Link>
        </div>

        {/* Trust strip */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground animate-fade-up">
          <div className="flex items-center gap-1.5"><Star className="size-3.5 text-[oklch(0.85_0.18_220)]" /> 3 free credits on signup</div>
          <div className="flex items-center gap-1.5"><Shield className="size-3.5 text-[oklch(0.85_0.18_220)]" /> No social posting, ever</div>
          <div className="flex items-center gap-1.5"><Download className="size-3.5 text-[oklch(0.85_0.18_220)]" /> Every output downloadable</div>
        </div>
      </section>

      {/* FEATURE GRID */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-24">
        <Reveal>
          <h2 className="text-3xl sm:text-5xl font-bold text-center mb-3">One studio. <span className="text-gradient">Four superpowers.</span></h2>
          <p className="text-muted-foreground text-center max-w-xl mx-auto">Each tool is purpose-built. None of the bloat.</p>
        </Reveal>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, to }, i) => (
            <Reveal key={title} delay={i * 80}>
              <Link to={to} className="block glass rounded-2xl p-6 lift gradient-border h-full group">
                <div className="size-12 rounded-xl bg-gradient-brand grid place-items-center mb-4 group-hover:glow-cyan transition">
                  <Icon className="size-5 text-background" />
                </div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{desc}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-32">
        <Reveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-4">
              <Wand2 className="size-3.5 text-[oklch(0.65_0.25_295)]" />
              <span className="text-xs font-medium">How it works</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold">Prompt → result. <span className="text-gradient">No fluff.</span></h2>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 100}>
              <div className="glass rounded-2xl p-6 h-full">
                <div className="text-5xl font-black text-gradient leading-none">0{s.n}</div>
                <div className="font-semibold mt-4">{s.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.desc}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* GUARANTEES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Zap,      title: "Instant",       desc: "Generations stream in seconds." },
            { icon: Download, title: "Yours forever", desc: "Every output has a download button." },
            { icon: Shield,   title: "No socials",    desc: "We never post for you. You own the moment." },
          ].map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 80}>
              <div className="glass rounded-2xl p-6 h-full">
                <Icon className="size-5 text-[oklch(0.65_0.25_295)] mb-3" />
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-32">
        <Reveal>
          <div className="glass-strong rounded-3xl p-10 sm:p-16 text-center gradient-border relative overflow-hidden">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 size-[400px] aurora opacity-50 rounded-full" />
            <h2 className="relative text-3xl sm:text-5xl font-bold">Make your <span className="text-gradient">first 3 things</span> free.</h2>
            <p className="relative text-muted-foreground mt-3 max-w-lg mx-auto">No credit card. Sign up, get 3 credits, ship something today.</p>
            <Link to="/auth" className="relative mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-brand text-background font-semibold glow-cyan hover:opacity-90 lift">
              Start creating free <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
      </section>
    </AppShell>
  );
}
