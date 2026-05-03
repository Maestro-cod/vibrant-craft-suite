import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

export function handleOptions(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return null;
}

export function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function getPublishableKey() {
  return (
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
    Deno.env.get("SUPABASE_ANON_KEY") ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6bWRlcnZqYWdnbWx2YmJxYWloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjE5ODQsImV4cCI6MjA5MzMzNzk4NH0.0hKtDzwu9RusmJNCaNqfUEXxcImTquQC7Ul3v8rua3I"
  );
}

export function createAdminClient() {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return {
      user: null,
      error: json({ error: "UNAUTHORIZED", message: "Missing authorization header." }, 401),
    };
  }

  const client = createClient(requiredEnv("SUPABASE_URL"), getPublishableKey(), {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    return {
      user: null,
      error: json({ error: "UNAUTHORIZED", message: "Invalid or expired session." }, 401),
    };
  }

  return { user: data.user, error: null };
}

export function parseDuration(value: unknown) {
  const duration = typeof value === "number" ? value : Number(value);
  if (duration !== 5 && duration !== 10) {
    throw new Error("Duration must be 5 or 10 seconds.");
  }
  return duration as 5 | 10;
}

export function parseAspectRatio(value: unknown) {
  if (value !== "9:16" && value !== "1:1" && value !== "16:9") {
    throw new Error("Aspect ratio must be 9:16, 1:1, or 16:9.");
  }
  return value as "9:16" | "1:1" | "16:9";
}

export function getVideoCost(duration: 5 | 10) {
  return duration === 10 ? 2 : 1;
}

export function normalizeStatus(status: unknown) {
  const value = String(status ?? "UNKNOWN").toUpperCase();
  if (["IN_QUEUE", "QUEUED"].includes(value)) return "IN_QUEUE";
  if (["IN_PROGRESS", "RUNNING", "PROCESSING"].includes(value)) return "IN_PROGRESS";
  if (["COMPLETED", "SUCCESS"].includes(value)) return "COMPLETED";
  if (["FAILED", "ERROR", "CANCELLED"].includes(value)) return "FAILED";
  return value;
}

export const VIDEO_MODEL = "fal-ai/kling-video/v3/pro/text-to-video";

export function getRequestUrls(requestId: string, model: string = VIDEO_MODEL) {
  // Fal's queue status/response endpoints only use the app namespace
  // (e.g. "fal-ai/kling-video"), not the full model path with version/variant.
  // Using the full path returns 405 Method Not Allowed.
  const parts = model.split("/");
  const appNamespace = parts.slice(0, 2).join("/");
  const base = `https://queue.fal.run/${appNamespace}/requests/${requestId}`;
  return {
    statusUrl: `${base}/status`,
    responseUrl: base,
  };
}

/**
 * Recursively walk an arbitrary provider payload and find the first plausible
 * video URL. Fal/Kling response shapes have changed multiple times across
 * versions (sometimes `video.url`, sometimes `videos[0].url`, sometimes
 * nested under `data`, `output`, `result`, `response`, `payload`, etc.), so
 * instead of hardcoding every known path we do a bounded deep search.
 *
 * Rules:
 *  - Returns the first string that looks like an http(s) URL ending in a
 *    known video extension (or a known video host).
 *  - Falls back to ANY http(s) string under a key that mentions "video",
 *    "url", "output", "asset", "file", or "download" if no extension match.
 *  - Bounded depth + visited set to avoid pathological payloads / cycles.
 */
type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const VIDEO_EXT_RE = /\.(mp4|mov|webm|m4v|mkv)(\?|#|$)/i;
const VIDEO_HOST_RE = /(fal\.media|fal\.ai|v3\.fal\.media|kling|cdn\.fal)/i;
const URL_KEY_RE = /(video|url|output|asset|file|download|src|uri|signed)/i;

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

export function extractVideoUrl(payload: unknown): string | undefined {
  if (payload == null) return undefined;

  const seen = new WeakSet<object>();
  let fallback: string | undefined;

  const walk = (node: Json, parentKey: string, depth: number): string | undefined => {
    if (depth > 8 || node == null) return undefined;

    if (typeof node === "string") {
      if (!isHttpUrl(node)) return undefined;
      if (VIDEO_EXT_RE.test(node)) return node;
      if (VIDEO_HOST_RE.test(node) && /video|kling/i.test(node)) return node;
      if (!fallback && URL_KEY_RE.test(parentKey)) fallback = node;
      return undefined;
    }

    if (typeof node !== "object") return undefined;
    if (seen.has(node as object)) return undefined;
    seen.add(node as object);

    if (Array.isArray(node)) {
      for (const item of node) {
        const hit = walk(item as Json, parentKey, depth + 1);
        if (hit) return hit;
      }
      return undefined;
    }

    for (const [key, value] of Object.entries(node)) {
      const hit = walk(value as Json, key, depth + 1);
      if (hit) return hit;
    }
    return undefined;
  };

  const direct = walk(payload as Json, "", 0);
  return direct ?? fallback;
}
