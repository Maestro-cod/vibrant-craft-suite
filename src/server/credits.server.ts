import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Server-side helper: deduct N credits from a user atomically.
 * Skips users with `unlimited = true`. Throws if balance would go negative.
 */
export async function spendCredits(userId: string, n = 1) {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("credits, unlimited")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw new Error("Profile not found");
  if (profile.unlimited) return { credits: profile.credits, unlimited: true };
  if (profile.credits < n) throw new Error("INSUFFICIENT_CREDITS");
  const { data: updated, error: uErr } = await supabaseAdmin
    .from("profiles")
    .update({ credits: profile.credits - n })
    .eq("id", userId)
    .select("credits")
    .single();
  if (uErr) throw uErr;
  return { credits: updated.credits, unlimited: false };
}
