import { createServerFn } from "@tanstack/react-start";
import { authed } from "@/integrations/supabase/authed-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

async function assertAdmin(userId: string, admin: SupabaseClient) {
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([authed])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.userId, supabaseAdmin);
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, plan, credits, unlimited, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return { users: data };
  });

const Adjust = z.object({
  userId: z.string().uuid(),
  credits: z.number().int().min(0).max(1000000),
});
export const adminSetCredits = createServerFn({ method: "POST" })
  .middleware([authed])
  .inputValidator((d) => Adjust.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.userId, supabaseAdmin);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ credits: data.credits })
      .eq("id", data.userId);
    if (error) throw error;
    return { ok: true };
  });

const Plan = z.object({
  userId: z.string().uuid(),
  plan: z.enum(["free", "basic", "pro", "elite"]),
});
export const adminSetPlan = createServerFn({ method: "POST" })
  .middleware([authed])
  .inputValidator((d) => Plan.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.userId, supabaseAdmin);
    await supabaseAdmin.rpc("grant_plan_credits", { _user_id: data.userId, _plan: data.plan });
    return { ok: true };
  });

export const adminStats = createServerFn({ method: "POST" })
  .middleware([authed])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.userId, supabaseAdmin);
    const [{ count: users }, { count: gens }, { data: plans }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("generations").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("plan"),
    ]);
    const byPlan: Record<string, number> = {};
    (plans ?? []).forEach((p: { plan: string | null }) => {
      if (p.plan) byPlan[p.plan] = (byPlan[p.plan] ?? 0) + 1;
    });
    return { users: users ?? 0, generations: gens ?? 0, byPlan };
  });
