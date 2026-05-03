import {
  createAdminClient,
  extractVideoUrl,
  getRequestUrls,
  getUserFromRequest,
  handleOptions,
  json,
  normalizeStatus,
  requiredEnv,
} from "../_shared/video.ts";

// --- Resilience helpers -----------------------------------------------------

const MAX_GENERATION_AGE_MS = 15 * 60 * 1000; // auto-fail anything older than 15 min

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { retries?: number; label: string },
): Promise<Response> {
  const retries = opts.retries ?? 3;
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, init);
      // Retry transient 5xx and 429
      if (res.status >= 500 || res.status === 429) {
        if (attempt < retries - 1) {
          const wait = 400 * Math.pow(2, attempt);
          console.warn(`[check-video] ${opts.label} got ${res.status}, retrying in ${wait}ms`);
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries - 1) {
        const wait = 400 * Math.pow(2, attempt);
        console.warn(`[check-video] ${opts.label} threw, retrying in ${wait}ms`, err);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`${opts.label} failed after ${retries} attempts`);
}

async function refundCredits(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  amount: number,
  reason: string,
) {
  if (!amount || amount <= 0) return;
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
    console.log(`[check-video] refunded ${amount} credit(s) to ${userId}: ${reason}`);
  } catch (err) {
    console.error("[check-video] refund failed", err);
  }
}

function parseProviderError(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Unknown provider error";
  const p = payload as Record<string, unknown>;
  const candidates = [
    p.error,
    p.message,
    p.detail,
    (p.error as Record<string, unknown> | undefined)?.message,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.slice(0, 400);
  }
  try {
    return JSON.stringify(payload).slice(0, 400);
  } catch {
    return "Unknown provider error";
  }
}

// --- Handler ---------------------------------------------------------------

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  if (req.method !== "POST") {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const requestId = String(body?.request_id ?? "").trim();
    if (!requestId) {
      return json({ error: "INVALID_REQUEST", message: "request_id is required." }, 400);
    }

    const { user, error: authError } = await getUserFromRequest(req);
    if (authError || !user) return authError!;

    const admin = createAdminClient();
    const { data: generation, error: generationError } = await admin
      .from("generations")
      .select("id, output_url, metadata, created_at")
      .eq("user_id", user.id)
      .eq("type", "video")
      .contains("metadata", { request_id: requestId })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (generationError) {
      console.error("[check-video] generation lookup failed", generationError);
      return json({ error: "LOOKUP_FAILED", message: "Could not load the requested video." }, 500);
    }

    if (!generation) {
      return json({ error: "NOT_FOUND", message: "Video request not found." }, 404);
    }

    const baseMetadata =
      typeof generation.metadata === "object" && generation.metadata
        ? (generation.metadata as Record<string, unknown>)
        : {};

    // Already completed → return cached URL.
    if (generation.output_url) {
      return json({
        generation_id: generation.id,
        status: "COMPLETED",
        url: generation.output_url,
      });
    }

    // Already marked failed → don't re-charge or re-poll.
    if (baseMetadata.status === "FAILED") {
      return json({
        generation_id: generation.id,
        status: "FAILED",
        message:
          typeof baseMetadata.provider_error === "string"
            ? baseMetadata.provider_error
            : "Video generation failed.",
      });
    }

    // Watchdog: auto-fail and refund stale generations.
    const ageMs = Date.now() - new Date(generation.created_at as string).getTime();
    if (ageMs > MAX_GENERATION_AGE_MS) {
      const creditsCost = Number(baseMetadata.credits_cost ?? 0);
      await refundCredits(admin, user.id, creditsCost, "watchdog timeout");
      const metadata = {
        ...baseMetadata,
        status: "FAILED",
        failed_at: new Date().toISOString(),
        provider_error: "Video generation timed out (>15 min).",
        refunded: creditsCost > 0,
      };
      await admin.from("generations").update({ metadata }).eq("id", generation.id);
      return json({
        generation_id: generation.id,
        status: "FAILED",
        message: "Video generation timed out. Your credits were refunded.",
      });
    }

    const falKey = requiredEnv("FAL_API_KEY");
    const { statusUrl, responseUrl } = getRequestUrls(requestId);

    let statusResponse: Response;
    try {
      statusResponse = await fetchWithRetry(
        statusUrl,
        { headers: { Authorization: `Key ${falKey}` } },
        { label: "status check" },
      );
    } catch (err) {
      console.error("[check-video] status check threw after retries", err);
      // Transient — leave generation in current state, let caller poll again.
      return json({
        generation_id: generation.id,
        status: baseMetadata.status ?? "IN_PROGRESS",
        transient_error: true,
      });
    }

    if (!statusResponse.ok) {
      const details = await statusResponse.text().catch(() => "");
      console.error("[check-video] status request failed", statusResponse.status, details);
      // 404 from provider after a long wait → treat as failed + refund.
      if (statusResponse.status === 404 && ageMs > 60_000) {
        const creditsCost = Number(baseMetadata.credits_cost ?? 0);
        await refundCredits(admin, user.id, creditsCost, "provider lost request");
        const metadata = {
          ...baseMetadata,
          status: "FAILED",
          failed_at: new Date().toISOString(),
          provider_error: "Provider no longer recognizes this request.",
          refunded: creditsCost > 0,
        };
        await admin.from("generations").update({ metadata }).eq("id", generation.id);
        return json({
          generation_id: generation.id,
          status: "FAILED",
          message: "Provider lost the request. Credits refunded.",
        });
      }
      return json({ error: "STATUS_CHECK_FAILED", message: details.slice(0, 400) }, 502);
    }

    const statusPayload = await statusResponse.json().catch(() => ({}));
    const status = normalizeStatus(statusPayload?.status ?? statusPayload?.state);

    if (status === "COMPLETED") {
      let resultPayload: unknown;
      try {
        const response = await fetchWithRetry(
          responseUrl,
          { headers: { Authorization: `Key ${falKey}` } },
          { label: "result fetch" },
        );
        if (!response.ok) {
          const details = await response.text().catch(() => "");
          console.error("[check-video] response fetch failed", response.status, details);
          return json({ error: "RESULT_FETCH_FAILED", message: details.slice(0, 400) }, 502);
        }
        resultPayload = await response.json();
      } catch (err) {
        console.error("[check-video] result fetch threw after retries", err);
        return json({
          generation_id: generation.id,
          status: "IN_PROGRESS",
          transient_error: true,
        });
      }

      const providerUrl = extractVideoUrl(resultPayload);
      if (!providerUrl) {
        console.error("[check-video] provider url missing", resultPayload);
        const creditsCost = Number(baseMetadata.credits_cost ?? 0);
        await refundCredits(admin, user.id, creditsCost, "missing video url");
        const metadata = {
          ...baseMetadata,
          status: "FAILED",
          failed_at: new Date().toISOString(),
          provider_error: "Provider completed but returned no video URL.",
          refunded: creditsCost > 0,
        };
        await admin.from("generations").update({ metadata }).eq("id", generation.id);
        return json(
          {
            error: "MISSING_VIDEO_URL",
            message: "Video provider completed, but no video URL was returned. Credits refunded.",
          },
          502,
        );
      }

      let videoBytes: Uint8Array;
      try {
        const videoResponse = await fetchWithRetry(
          providerUrl,
          {},
          { label: "asset download", retries: 4 },
        );
        if (!videoResponse.ok) {
          console.error("[check-video] provider asset download failed", videoResponse.status);
          return json({
            generation_id: generation.id,
            status: "IN_PROGRESS",
            transient_error: true,
          });
        }
        videoBytes = new Uint8Array(await videoResponse.arrayBuffer());
      } catch (err) {
        console.error("[check-video] asset download threw after retries", err);
        return json({
          generation_id: generation.id,
          status: "IN_PROGRESS",
          transient_error: true,
        });
      }

      const storagePath = `${user.id}/video/${requestId}.mp4`;
      let uploadOk = false;
      let lastUploadErr: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error: uploadError } = await admin.storage
          .from("generations")
          .upload(storagePath, videoBytes, {
            contentType: "video/mp4",
            upsert: true,
          });
        if (!uploadError) {
          uploadOk = true;
          break;
        }
        lastUploadErr = uploadError;
        await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)));
      }
      if (!uploadOk) {
        console.error("[check-video] storage upload failed after retries", lastUploadErr);
        // Fallback: save the provider URL directly so the user can still access the video.
        const fallbackMetadata = {
          ...baseMetadata,
          status: "COMPLETED",
          provider_url: providerUrl,
          storage_path: null,
          storage_upload_error:
            lastUploadErr instanceof Error ? lastUploadErr.message : String(lastUploadErr),
          completed_at: new Date().toISOString(),
        };
        const { error: fallbackUpdateErr } = await admin
          .from("generations")
          .update({ output_url: providerUrl, metadata: fallbackMetadata })
          .eq("id", generation.id);
        if (fallbackUpdateErr) {
          console.error("[check-video] fallback update failed", fallbackUpdateErr);
        }
        return json({
          generation_id: generation.id,
          status: "COMPLETED",
          url: providerUrl,
          warning: "Stored provider URL directly (our storage upload failed).",
        });
      }

      const { data: publicData } = admin.storage.from("generations").getPublicUrl(storagePath);
      const metadata = {
        ...baseMetadata,
        status: "COMPLETED",
        provider_url: providerUrl,
        storage_path: storagePath,
        completed_at: new Date().toISOString(),
      };

      const { error: updateError } = await admin
        .from("generations")
        .update({
          output_url: publicData.publicUrl,
          metadata,
        })
        .eq("id", generation.id);

      if (updateError) {
        console.error("[check-video] generation update failed", updateError);
        // Storage upload succeeded — return URL even if history update failed.
        return json({
          generation_id: generation.id,
          status: "COMPLETED",
          url: publicData.publicUrl,
          warning: "History update failed but video is available.",
        });
      }

      return json({
        generation_id: generation.id,
        status: "COMPLETED",
        url: publicData.publicUrl,
      });
    }

    if (status === "FAILED") {
      const creditsCost = Number(baseMetadata.credits_cost ?? 0);
      await refundCredits(admin, user.id, creditsCost, "provider reported FAILED");
      const providerError = parseProviderError(statusPayload);
      const metadata = {
        ...baseMetadata,
        status: "FAILED",
        failed_at: new Date().toISOString(),
        provider_error: providerError,
        refunded: creditsCost > 0,
      };
      await admin.from("generations").update({ metadata }).eq("id", generation.id);
      return json({
        generation_id: generation.id,
        status: "FAILED",
        message: `Video generation failed: ${providerError}. Credits refunded.`,
      });
    }

    const metadata = {
      ...baseMetadata,
      status,
      last_checked_at: new Date().toISOString(),
    };
    await admin.from("generations").update({ metadata }).eq("id", generation.id);

    return json({
      generation_id: generation.id,
      status,
    });
  } catch (error) {
    console.error("[check-video] unexpected error", error);
    return json(
      {
        error: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unexpected error.",
      },
      500,
    );
  }
});
