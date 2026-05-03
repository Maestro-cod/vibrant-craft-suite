import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="size-8 rounded-lg bg-gradient-brand grid place-items-center glow-cyan">
              <Sparkles className="size-4 text-background" />
            </div>
            <span className="text-gradient">HyperPost AI</span>
          </div>
          <p className="text-sm text-muted-foreground mt-3 max-w-sm">
            The creator studio for video, music, voice and scripts. Built for speed. You own every output.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Product</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/video" className="hover:text-foreground">Video</Link></li>
            <li><Link to="/music" className="hover:text-foreground">Music</Link></li>
            <li><Link to="/voice" className="hover:text-foreground">Voice-Over</Link></li>
            <li><Link to="/script" className="hover:text-foreground">Scripts</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
            <li><Link to="/auth" className="hover:text-foreground">Sign in</Link></li>
            <li><Link to="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link></li>
            <li><Link to="/terms-of-service" className="hover:text-foreground">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-muted-foreground">
        © 2026 HyperPost AI. All rights reserved.
      </div>
    </footer>
  );
}
