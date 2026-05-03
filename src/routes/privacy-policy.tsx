import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/GlassCard";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — HyperPost AI" },
      {
        name: "description",
        content: "How HyperPost AI collects, uses, and protects your information.",
      },
      { property: "og:title", content: "Privacy Policy — HyperPost AI" },
      {
        property: "og:description",
        content: "How HyperPost AI collects, uses, and protects your information.",
      },
    ],
  }),
  component: PrivacyPolicyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function PrivacyPolicyPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-xl bg-gradient-brand glow-cyan">
            <Shield className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Effective date: January 1, 2026</p>
          </div>
        </div>

        <GlassCard className="space-y-8">
          <p className="text-sm text-muted-foreground">
            HyperPost AI ("we", "us", or "our") respects your privacy. This Privacy Policy explains
            how we collect, use, disclose, and safeguard your information when you use our website
            and services (collectively, the "Service"). By using the Service, you agree to the
            practices described below.
          </p>

          <Section title="1. Information We Collect">
            <p>We collect the following categories of information:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Account information:</strong> name, email address, profile photo, and
                authentication identifiers when you sign up or sign in (including via Google).
              </li>
              <li>
                <strong>Content you create:</strong> prompts, scripts, generated videos, audio, and
                other media you produce using the Service.
              </li>
              <li>
                <strong>Billing information:</strong> processed by our payment provider (Stripe). We
                do not store full card details on our servers.
              </li>
              <li>
                <strong>Usage data:</strong> pages visited, features used, generation history,
                credit consumption, device, browser, and IP address.
              </li>
              <li>
                <strong>Cookies and similar technologies:</strong> for authentication, preferences,
                and analytics.
              </li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide, operate, and maintain the Service.</li>
              <li>Process AI generation requests through third-party model providers.</li>
              <li>Manage accounts, subscriptions, billing, and credit balances.</li>
              <li>Improve, personalize, and expand features.</li>
              <li>Send transactional emails (receipts, security alerts, important updates).</li>
              <li>Detect, prevent, and address fraud, abuse, or technical issues.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </Section>

          <Section title="3. Data Sharing">
            <p>We do not sell your personal information. We share data only with:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Service providers</strong> who help us operate the platform (hosting,
                database, AI model providers such as fal.ai and ElevenLabs, email delivery,
                analytics).
              </li>
              <li>
                <strong>Payment processors</strong> (Stripe) to handle subscriptions and
                transactions.
              </li>
              <li>
                <strong>Legal authorities</strong> when required by law, subpoena, or to protect
                rights, safety, and property.
              </li>
              <li>
                <strong>Successors</strong> in the event of a merger, acquisition, or asset sale,
                subject to this Policy.
              </li>
            </ul>
          </Section>

          <Section title="4. Cookies">
            <p>
              We use cookies and similar technologies to keep you signed in, remember preferences,
              and understand how the Service is used. You can disable cookies in your browser
              settings, but some features may not function properly without them.
            </p>
          </Section>

          <Section title="5. Data Retention">
            <p>
              We retain your account information for as long as your account is active. Generated
              content is stored while your account exists or until you delete it. Billing records
              are retained as required by tax and accounting laws (typically up to 7 years). When
              you delete your account, we remove or anonymize personal data within 30 days, except
              where retention is required by law.
            </p>
          </Section>

          <Section title="6. User Rights">
            <p>
              Depending on your jurisdiction (including the EU/EEA, UK, and California), you may
              have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal data we hold about you.</li>
              <li>Correct inaccurate or incomplete data.</li>
              <li>Delete your account and personal data.</li>
              <li>Export your data in a portable format.</li>
              <li>Object to or restrict certain processing.</li>
              <li>Withdraw consent at any time.</li>
              <li>Lodge a complaint with a data protection authority.</li>
            </ul>
            <p>To exercise these rights, contact us using the details below.</p>
          </Section>

          <Section title="7. Security">
            <p>
              We use industry-standard safeguards including TLS encryption in transit, encrypted
              storage at rest, role-based access controls, row-level security on our database, and
              regular security reviews. No method of transmission or storage is 100% secure, and we
              cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>
              The Service is not directed to children under 13, and we do not knowingly collect
              personal information from anyone under 13. If you believe a child has provided us
              personal data, contact us and we will delete it promptly. Users between 13 and the age
              of majority in their jurisdiction must have parent or guardian consent to use the
              Service.
            </p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. The "Effective date" at the top
              reflects the latest revision. Material changes will be communicated through the
              Service or by email. Continued use of the Service after changes take effect
              constitutes acceptance of the updated Policy.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              For privacy questions or to exercise your rights, contact us at{" "}
              <a href="mailto:privacy@hyperpostai.com" className="text-primary hover:underline">
                privacy@hyperpostai.com
              </a>
              .
            </p>
          </Section>
        </GlassCard>
      </div>
    </AppShell>
  );
}
