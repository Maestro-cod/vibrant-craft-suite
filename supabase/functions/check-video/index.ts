import {
  createAdminClient,
  extractVideoUrl,
  getKlingRequestUrls,
  getUserFromRequest,
  handleOptions,
  json,
  normalizeStatus,
  requiredEnv,
} from "../_shared/video.ts";

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  if (req.method !== "POST") {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const body = await req.json();
    const requestId = String(body?.request_id ?? "").trim();
    if (!requestId) {
      return json({ error: "INVALID_REQUEST", message: "request_id is required." }, 400);
    }

    const { user, error: authError } = await getUserFromRequest(req);
    if (authError || !user) return authError!;

    const admin = createAdminClient();
    const { data: generation, error: generationError } = await admin
      .from("generations")
      .select("id, output_url, metadata")
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

    if (generation.output_url) {
      return json({
        generation_id: generation.id,
        status: "COMPLETED",
        url: generation.output_url,
      });
    }

    const falKey = requiredEnv("FAL_API_KEY");
    const { statusUrl, responseUrl } = getKlingRequestUrls(requestId);
    const statusResponse = await fetch(statusUrl, {
      headers: { Authorization: `Key ${falKey}` },
    });

    if (!statusResponse.ok) {
      const details = await statusResponse.text();
      console.error("[check-video] status request failed", statusResponse.status, details);
      return json({ error: "STATUS_CHECK_FAILED", message: details.slice(0, 400) }, 502);
    }

    const statusPayload = await statusResponse.json();
    const status = normalizeStatus(statusPayload?.status ?? statusPayload?.state);
    const baseMetadata = typeof generation.metadata === "object" && generation.metadata ? generation.metadata as Record<string, unknown> : {};

    if (status === "COMPLETED") {
      const response = await fetch(responseUrl, {
        headers: { Authorization: `Key ${falKey}` },
      });

      if (!response.ok) {
        const details = await response.text();
        console.error("[check-video] response fetch failed", response.status, details);
        return json({ error: "RESULT_FETCH_FAILED", message: details.slice(0, 400) }, 502);
      }

      const resultPayload = await response.json();
      const providerUrl = extractVideoUrl(resultPayload);
      if (!providerUrl) {
        console.error("[check-video] provider url missing", resultPayload);
        return json({ error: "MISSING_VIDEO_URL", message: "Video provider completed, but no video URL was returned." }, 502);
      }

      const videoResponse = await fetch(providerUrl);
      if (!videoResponse.ok) {
        console.error("[check-video] provider asset download failed", videoResponse.status);
        return json({ error: "DOWNLOAD_FAILED", message: "Could not download the generated video." }, 502);
      }

      const videoBytes = new Uint8Array(await videoResponse.arrayBuffer());
      const storagePath = `${user.id}/video/${requestId}.mp4`;
      const { error: uploadError } = await admin.storage
        .from("generations")
        .upload(storagePath, videoBytes, {
          contentType: "video/mp4",
          upsert: true,
        });

      if (uploadError) {
        console.error("[check-video] storage upload failed", uploadError);
        return json({ error: "UPLOAD_FAILED", message: "Video finished, but storing it failed." }, 500);
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
        return json({ error: "SAVE_FAILED", message: "Video finished, but history update failed." }, 500);
      }

      return json({
        generation_id: generation.id,
        status: "COMPLETED",
        url: publicData.publicUrl,
      });
    }

    if (status === "FAILED") {
      const metadata = {
        ...baseMetadata,
        status: "FAILED",
        failed_at: new Date().toISOString(),
        provider_error: statusPayload?.error ?? statusPayload?.message ?? null,
      };

      await admin.from("generations").update({ metadata }).eq("id", generation.id);

      return json({
        generation_id: generation.id,
        status: "FAILED",
        message: "Video generation failed with the provider.",
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
    return json({ error: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unexpected error." }, 500);
  }
});
