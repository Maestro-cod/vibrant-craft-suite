import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/terms-of-service")({
  head: () => ({
    meta: [
      { title: "Terms of Service — HyperPost AI" },
      { name: "description", content: "The terms that govern your use of HyperPost AI." },
      { property: "og:title", content: "Terms of Service — HyperPost AI" },
      { property: "og:description", content: "The terms that govern your use of HyperPost AI." },
    ],
  }),
  component: TermsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function TermsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-xl bg-gradient-brand glow-cyan">
            <FileText className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Effective date: January 1, 2026</p>
          </div>
        </div>

        <GlassCard className="space-y-8">
          <p className="text-sm text-muted-foreground">
            These Terms of Service ("Terms") govern your access to and use of HyperPost AI (the "Service").
            By creating an account or using the Service, you agree to these Terms.
          </p>

          <Section title="1. Eligibility">
            <p>You must be at least 13 years old to use the Service. If you are under the age of majority in your jurisdiction, you must have the consent of a parent or guardian.</p>
          </Section>

          <Section title="2. Accounts">
            <p>You are responsible for safeguarding your account credentials and for all activity that occurs under your account. Notify us immediately of any unauthorized use.</p>
          </Section>

          <Section title="3. Subscriptions and Credits">
            <p>Paid plans renew automatically until cancelled. Credits are consumed when generating content. Unused credits expire at the end of each billing cycle unless stated otherwise. All fees are non-refundable except where required by law.</p>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree not to use the Service to create content that is illegal, infringing, defamatory, harassing, sexually explicit involving minors, or designed to deceive or harm others. We may suspend accounts that violate these rules.</p>
          </Section>

          <Section title="5. Content Ownership">
            <p>You retain ownership of the content you generate, subject to the licenses of the underlying AI providers. You are responsible for ensuring your prompts and outputs comply with applicable laws and third-party rights.</p>
          </Section>

          <Section title="6. Disclaimers">
            <p>The Service is provided "as is" without warranties of any kind. AI outputs may be inaccurate or unsuitable for your purposes. You use the Service at your own risk.</p>
          </Section>

          <Section title="7. Limitation of Liability">
            <p>To the maximum extent permitted by law, HyperPost AI is not liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits or revenues. Our total liability is limited to the amount you paid us in the 12 months prior to the claim.</p>
          </Section>

          <Section title="8. Termination">
            <p>You may stop using the Service at any time. We may suspend or terminate your access for violations of these Terms or for any reason with reasonable notice.</p>
          </Section>

          <Section title="9. Changes">
            <p>We may update these Terms from time to time. Material changes will be communicated through the Service. Continued use after changes take effect constitutes acceptance.</p>
          </Section>

          <Section title="10. Contact">
            <p>
              Questions about these Terms? Contact us at{" "}
              <a href="mailto:legal@hyperpostai.com" className="text-primary hover:underline">legal@hyperpostai.com</a>.
            </p>
          </Section>

          <p className="border-t border-white/5 pt-6 text-center text-xs text-muted-foreground">
            © 2026 HyperPost AI. All rights reserved.
          </p>
        </GlassCard>
      </div>
    </AppShell>
  );
}
