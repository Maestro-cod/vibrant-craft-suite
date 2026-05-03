import {
  createAdminClient,
  getUserFromRequest,
  getVideoCost,
  handleOptions,
  json,
  parseAspectRatio,
  parseDuration,
  requiredEnv,
  VIDEO_MODEL,
} from "../_shared/video.ts";

/**
 * Atomically deduct credits with optimistic concurrency. Returns true on success.
 * Skips when admin/unlimited.
 */
async function chargeCredits(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  amount: number,
): Promise<{ ok: true } | { ok: false; reason: "RACE" | "INSUFFICIENT" | "ERROR" }> {
  const { data: profile, error } = await admin
    .from("profiles")
    .select("credits, unlimited")
    .eq("id", userId)
    .maybeSingle();
  if (error || !profile) return { ok: false, reason: "ERROR" };
  if (profile.unlimited) return { ok: true };
  if (profile.credits < amount) return { ok: false, reason: "INSUFFICIENT" };
  const { data: updated, error: uErr } = await admin
    .from("profiles")
    .update({ credits: profile.credits - amount })
    .eq("id", userId)
    .eq("credits", profile.credits) // optimistic lock
    .select("credits")
    .maybeSingle();
  if (uErr || !updated) return { ok: false, reason: "RACE" };
  return { ok: true };
}

async function refundCredits(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  amount: number,
  reason: string,
) {
  if (amount <= 0) return;
  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("credits, unlimited")
      .eq("id", userId)
      .maybeSingle();
    if (!profile || profile.unlimited) return;
    await admin
      .from("profiles")
      .update({ credits: profile.credits + amount })
      .eq("id", userId);
    console.log(`[start-video] refunded ${amount} to ${userId}: ${reason}`);
  } catch (err) {
    console.error("[start-video] refund failed", err);
  }
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  if (req.method !== "POST") {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  let charged = false;
  let chargedUserId: string | null = null;
  let chargedAmount = 0;

  try {
    const body = await req.json().catch(() => ({}));
    const prompt = String(body?.prompt ?? "").trim();

    let aspectRatio: ReturnType<typeof parseAspectRatio>;
    let duration: ReturnType<typeof parseDuration>;
    try {
      aspectRatio = parseAspectRatio(body?.aspect_ratio);
      duration = parseDuration(body?.duration);
    } catch (err) {
      return json(
        { error: "INVALID_INPUT", message: err instanceof Error ? err.message : "Invalid input" },
        400,
      );
    }

    if (prompt.length < 3 || prompt.length > 2000) {
      return json(
        { error: "INVALID_PROMPT", message: "Prompt must be between 3 and 2000 characters." },
        400,
      );
    }

    const { user, error: authError } = await getUserFromRequest(req);
    if (authError || !user) return authError!;

    const isAdminEmail = user.email?.toLowerCase() === "stefanmaestro25@gmail.com";
    const admin = createAdminClient();
    const creditsRequired = getVideoCost(duration);

    // Charge UP FRONT atomically. Refund on any downstream failure.
    if (!isAdminEmail) {
      const charge = await chargeCredits(admin, user.id, creditsRequired);
      if (!charge.ok) {
        if (charge.reason === "INSUFFICIENT") {
          return json(
            {
              error: "INSUFFICIENT_CREDITS",
              message: `You need ${creditsRequired} credit${creditsRequired === 1 ? "" : "s"} for a ${duration}s video.`,
            },
            402,
          );
        }
        if (charge.reason === "RACE") {
          return json(
            {
              error: "CREDIT_UPDATE_FAILED",
              message: "Your credit balance changed. Please refresh and try again.",
            },
            409,
          );
        }
        return json({ error: "PROFILE_NOT_FOUND", message: "Could not load your profile." }, 500);
      }
      charged = true;
      chargedUserId = user.id;
      chargedAmount = creditsRequired;
    }

    const falKey = requiredEnv("FAL_API_KEY");
    const model = VIDEO_MODEL;

    let submitResponse: Response;
    try {
      submitResponse = await fetch(`https://queue.fal.run/${model}`, {
        method: "POST",
        headers: {
          Authorization: `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          duration: String(duration),
          aspect_ratio: aspectRatio,
          generate_audio: true,
        }),
      });
    } catch (err) {
      if (charged && chargedUserId)
        await refundCredits(admin, chargedUserId, chargedAmount, "fal submit network error");
      console.error("[start-video] fal submit threw", err);
      return json(
        { error: "FAL_SUBMIT_FAILED", message: "Could not reach the video provider." },
        502,
      );
    }

    if (!submitResponse.ok) {
      const details = await submitResponse.text().catch(() => "");
      if (charged && chargedUserId)
        await refundCredits(admin, chargedUserId, chargedAmount, `fal submit ${submitResponse.status}`);
      console.error("[start-video] fal submit failed", submitResponse.status, details);
      return json({ error: "FAL_SUBMIT_FAILED", message: details.slice(0, 400) }, 502);
    }

    const submitPayload = await submitResponse.json().catch(() => ({}));
    const requestId = submitPayload?.request_id ?? submitPayload?.requestId;
    if (!requestId || typeof requestId !== "string") {
      if (charged && chargedUserId)
        await refundCredits(admin, chargedUserId, chargedAmount, "missing request id");
      console.error("[start-video] missing request id", submitPayload);
      return json(
        {
          error: "INVALID_PROVIDER_RESPONSE",
          message: "Video provider did not return a request ID.",
        },
        502,
      );
    }

    const { data: generation, error: insertError } = await admin
      .from("generations")
      .insert({
        user_id: user.id,
        type: "video",
        prompt,
        output_url: null,
        metadata: {
          request_id: requestId,
          status: "IN_QUEUE",
          aspect_ratio: aspectRatio,
          duration,
          credits_cost: creditsRequired,
          provider: model,
          started_at: new Date().toISOString(),
        },
      })
      .select("id")
      .single();

    if (insertError || !generation) {
      // Generation row failed to save — credits were charged but the video can't be tracked.
      // Refund so the user isn't billed for an untrackable job.
      if (charged && chargedUserId)
        await refundCredits(admin, chargedUserId, chargedAmount, "generation insert failed");
      console.error("[start-video] generation insert failed", insertError);
      return json(
        {
          error: "GENERATION_SAVE_FAILED",
          message: "Could not save the video to history. Your credits were not charged.",
        },
        500,
      );
    }

    return json({
      request_id: requestId,
      generation_id: generation.id,
      status: "IN_QUEUE",
      credits_charged: charged ? creditsRequired : 0,
      poll_after_ms: 10000,
    });
  } catch (error) {
    if (charged && chargedUserId) {
      const admin = createAdminClient();
      await refundCredits(admin, chargedUserId, chargedAmount, "unexpected error");
    }
    console.error("[start-video] unexpected error", error);
    return json(
      {
        error: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unexpected error.",
      },
      500,
    );
  }
});
