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

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  if (req.method !== "POST") {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const body = await req.json();
    const prompt = String(body?.prompt ?? "").trim();
    const aspectRatio = parseAspectRatio(body?.aspect_ratio);
    const duration = parseDuration(body?.duration);

    if (prompt.length < 3 || prompt.length > 2000) {
      return json({ error: "INVALID_PROMPT", message: "Prompt must be between 3 and 2000 characters." }, 400);
    }

    const { user, error: authError } = await getUserFromRequest(req);
    if (authError || !user) return authError!;

    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("credits, unlimited")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[start-video] profile lookup failed", profileError);
      return json({ error: "PROFILE_NOT_FOUND", message: "Could not load your profile." }, 404);
    }

    const creditsRequired = getVideoCost(duration);
    if (!profile.unlimited && profile.credits < creditsRequired) {
      return json(
        {
          error: "INSUFFICIENT_CREDITS",
          message: `You need ${creditsRequired} credit${creditsRequired === 1 ? "" : "s"} for a ${duration}s video.`,
        },
        402,
      );
    }

    const falKey = requiredEnv("FAL_API_KEY");
    const model = VIDEO_MODEL;
    const submitResponse = await fetch(`https://queue.fal.run/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        duration: String(duration),
        aspect_ratio: aspectRatio,
      }),
    });

    if (!submitResponse.ok) {
      const details = await submitResponse.text();
      console.error("[start-video] fal submit failed", submitResponse.status, details);
      return json({ error: "FAL_SUBMIT_FAILED", message: details.slice(0, 400) }, 502);
    }

    const submitPayload = await submitResponse.json();
    const requestId = submitPayload?.request_id ?? submitPayload?.requestId;
    if (!requestId || typeof requestId !== "string") {
      console.error("[start-video] missing request id", submitPayload);
      return json({ error: "INVALID_PROVIDER_RESPONSE", message: "Video provider did not return a request ID." }, 502);
    }

    if (!profile.unlimited) {
      const nextCredits = profile.credits - creditsRequired;
      const { data: updatedProfile, error: creditError } = await admin
        .from("profiles")
        .update({ credits: nextCredits })
        .eq("id", user.id)
        .eq("credits", profile.credits)
        .select("credits")
        .maybeSingle();

      if (creditError || !updatedProfile) {
        console.error("[start-video] credit update failed", creditError);
        return json({ error: "CREDIT_UPDATE_FAILED", message: "Your credit balance changed. Please refresh and try again." }, 409);
      }
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
      console.error("[start-video] generation insert failed", insertError);
      return json({ error: "GENERATION_SAVE_FAILED", message: "Video was queued, but we could not save it to history." }, 500);
    }

    return json({
      request_id: requestId,
      generation_id: generation.id,
      status: "IN_QUEUE",
      credits_charged: creditsRequired,
      poll_after_ms: 10000,
    });
  } catch (error) {
    console.error("[start-video] unexpected error", error);
    return json({ error: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unexpected error." }, 500);
  }
});
