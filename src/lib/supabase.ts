import {
  createBrowserClient,
  createServerClient,
  parseCookieHeader,
  type CookieOptions,
} from "@supabase/ssr";
import type { AstroCookies } from "astro";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

/**
 * Browser-side Supabase client. Used in client scripts where we need the SDK
 * in the browser. Persists the session in cookies so the server can read it
 * on the next request.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Server-side Supabase client bound to the current request's cookies. This is
 * how SSR pages read the logged-in user and run RLS-scoped queries.
 * Reads come from the request's Cookie header; writes go through Astro cookies.
 */
export function createSupabaseServerClient(request: Request, cookies: AstroCookies) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "").map(
          ({ name, value }) => ({ name, value: value ?? "" }),
        );
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options as CookieOptions);
        });
      },
    },
  });
}
