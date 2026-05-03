import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Stripe webhook. Configure in Stripe → Webhooks:
 *   URL: https://<your-site>/api/public/stripe-webhook
 *   Events: checkout.session.completed, customer.subscription.updated,
 *           customer.subscription.deleted, invoice.paid
 *   Then add the signing secret to project secrets as STRIPE_WEBHOOK_SECRET.
 */
export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sk = process.env.STRIPE_SECRET_KEY;
        const wh = process.env.STRIPE_WEBHOOK_SECRET;
        if (!sk || !wh) return new Response("Webhook not configured", { status: 500 });
        const stripe = new Stripe(sk);

        const sig = request.headers.get("stripe-signature");
        const raw = await request.text();
        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(raw, sig ?? "", wh);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Invalid signature";
          return new Response(`Bad signature: ${msg}`, { status: 400 });
        }

        const planFromMeta = (m: Record<string, string> | null | undefined) =>
          (m?.plan as "basic" | "pro" | "elite" | undefined) ?? null;

        try {
          if (event.type === "checkout.session.completed") {
            const sess = event.data.object as Stripe.Checkout.Session;
            const userId = sess.metadata?.user_id;
            const plan = planFromMeta(sess.metadata);
            if (userId && plan && sess.subscription) {
              await supabaseAdmin.from("subscriptions").upsert(
                {
                  user_id: userId,
                  stripe_customer_id: sess.customer as string,
                  stripe_subscription_id: sess.subscription as string,
                  plan,
                  status: "active",
                },
                { onConflict: "user_id" },
              );
              await supabaseAdmin.rpc("grant_plan_credits", { _user_id: userId, _plan: plan });
            }
          } else if (event.type === "customer.subscription.updated") {
            const sub = event.data.object as Stripe.Subscription;
            const userId = sub.metadata?.user_id;
            const plan = planFromMeta(sub.metadata);
            if (userId) {
              await supabaseAdmin.from("subscriptions").upsert(
                {
                  user_id: userId,
                  stripe_customer_id: sub.customer as string,
                  stripe_subscription_id: sub.id,
                  plan: plan ?? "basic",
                  status: sub.status,
                  current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                },
                { onConflict: "user_id" },
              );
            }
          } else if (event.type === "customer.subscription.deleted") {
            const sub = event.data.object as Stripe.Subscription;
            const userId = sub.metadata?.user_id;
            if (userId) {
              await supabaseAdmin
                .from("subscriptions")
                .update({ status: "canceled", plan: "free" })
                .eq("user_id", userId);
              await supabaseAdmin.rpc("grant_plan_credits", { _user_id: userId, _plan: "free" });
            }
          } else if (event.type === "invoice.paid") {
            const inv = event.data.object as Stripe.Invoice;
            const subId = typeof inv.subscription === "string" ? inv.subscription : undefined;
            if (subId) {
              const sub = await stripe.subscriptions.retrieve(subId);
              const userId = sub.metadata?.user_id;
              const plan = planFromMeta(sub.metadata);
              if (userId && plan) {
                await supabaseAdmin.rpc("grant_plan_credits", { _user_id: userId, _plan: plan });
              }
            }
          }
        } catch (e) {
          console.error("Stripe webhook handler error:", e);
          const msg = e instanceof Error ? e.message : "Unknown error";
          return new Response(`Handler error: ${msg}`, { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
