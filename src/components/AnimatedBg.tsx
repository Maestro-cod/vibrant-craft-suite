export function AnimatedBg() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Grid */}
      <div className="absolute inset-0 grid-bg" />
      {/* Aurora blobs */}
      <div className="absolute -top-40 left-1/4 size-[520px] rounded-full bg-[oklch(0.85_0.18_220/0.16)] blur-3xl animate-pulse-glow" />
      <div className="absolute top-1/3 -right-40 size-[620px] rounded-full bg-[oklch(0.65_0.25_295/0.18)] blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
      <div className="absolute bottom-0 left-1/3 size-[440px] rounded-full bg-[oklch(0.85_0.18_220/0.10)] blur-3xl animate-pulse-glow" style={{ animationDelay: "3s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[700px] rounded-full aurora opacity-30" />
      {/* Bottom fade */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,transparent,#050508_75%)]" />
      {/* Noise */}
      <div className="absolute inset-0 opacity-[0.025] mix-blend-overlay"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")" }} />
    </div>
  );
}
