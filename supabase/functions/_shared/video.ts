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
    return { user: null, error: json({ error: "UNAUTHORIZED", message: "Missing authorization header." }, 401) };
  }

  const client = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_PUBLISHABLE_KEY"), {
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
    return { user: null, error: json({ error: "UNAUTHORIZED", message: "Invalid or expired session." }, 401) };
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

export function getKlingRequestUrls(requestId: string) {
  const base = `https://queue.fal.run/fal-ai/kling-video/requests/${requestId}`;
  return {
    statusUrl: `${base}/status`,
    responseUrl: base,
  };
}

export function extractVideoUrl(payload: any): string | undefined {
  return payload?.video?.url
    ?? payload?.data?.video?.url
    ?? payload?.videos?.[0]?.url
    ?? payload?.data?.videos?.[0]?.url
    ?? payload?.output?.url
    ?? payload?.data?.output?.url;
}
