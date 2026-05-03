export function AnimatedBg() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-[oklch(0.85_0.18_220/0.18)] blur-3xl animate-pulse-glow" />
      <div className="absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full bg-[oklch(0.65_0.25_295/0.18)] blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
      <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-[oklch(0.85_0.18_220/0.12)] blur-3xl animate-pulse-glow" style={{ animationDelay: "3s" }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,transparent,#050508_70%)]" />
    </div>
  );
}
