import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";
import { requireSupabaseAuth } from "./auth-middleware";

/**
 * Composed middleware: on the client, attach the current Supabase access token
 * as an Authorization header so the server-side `requireSupabaseAuth`
 * middleware can validate the request.
 */
export const authed = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .client(async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  });
