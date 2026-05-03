import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Stripe from "stripe";
import { authed } from "@/integrations/supabase/authed-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key);
}

function getPlanPriceId(plan: "basic" | "pro" | "elite") {
  const envKey = {
    basic: "STRIPE_PRICE_ID_BASIC",
    pro: "STRIPE_PRICE_ID_PRO",
    elite: "STRIPE_PRICE_ID_ELITE",
  }[plan];

  const priceId = process.env[envKey];
  return priceId?.trim() || null;
}

// Plan -> default monthly price (USD, in cents)
const PLAN_PRICE: Record<"basic" | "pro" | "elite", { amount: number; credits: number; name: string }> = {
  basic: { amount: 1200, credits: 100, name: "HyperPost Basic" },
  pro: { amount: 3500, credits: 400, name: "HyperPost Pro" },
  elite: { amount: 5900, credits: 1000, name: "HyperPost Elite" },
};

const Input = z.object({ plan: z.enum(["basic", "pro", "elite"]) });

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([authed])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const s = stripe();
    const cfg = PLAN_PRICE[data.plan];
    const priceId = getPlanPriceId(data.plan);
    const origin = process.env.PUBLIC_SITE_URL || claims.iss?.split("/auth/v1")[0] || "";

    // Reuse customer if it exists
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", userId)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await s.customers.create({
        email: profile?.email ?? (claims.email as string | undefined),
        metadata: { user_id: userId },
      });
      customerId = customer.id;
      await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
    }

    const session = await s.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancel`,
      allow_promotion_codes: true,
      line_items: priceId
        ? [{ quantity: 1, price: priceId }]
        : [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                recurring: { interval: "month" },
                unit_amount: cfg.amount,
                product_data: {
                  name: cfg.name,
                  description: `${cfg.credits} credits per month`,
                },
              },
            },
          ],
      metadata: { user_id: userId, plan: data.plan },
      subscription_data: { metadata: { user_id: userId, plan: data.plan } },
    });

    return { url: session.url };
  });

export const openBillingPortal = createServerFn({ method: "POST" })
  .middleware([authed])
  .handler(async ({ context }) => {
    const { userId, claims } = context;
    const s = stripe();
    const origin = process.env.PUBLIC_SITE_URL || claims.iss?.split("/auth/v1")[0] || "";
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.stripe_customer_id) throw new Error("No subscription yet.");
    const portal = await s.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    });
    return { url: portal.url };
  });
