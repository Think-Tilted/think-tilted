import type { AstroCookies } from "astro";
import { createSupabaseServerClient } from "./supabase";

/**
 * The result an admin page needs: a request-bound Supabase client and the
 * signed-in user's email. Pages call `requireAdmin` at the top of their
 * frontmatter; if it returns a Response, return it immediately (a redirect).
 */
export interface AdminContext {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  email: string;
}

/**
 * Gate an admin page. Returns the context when a user is signed in, or a
 * redirect Response to /login when not. RLS is still the real boundary — this
 * just gives a clean redirect instead of an empty page.
 */
export async function requireAdmin(
  request: Request,
  cookies: AstroCookies,
  redirect: (path: string) => Response,
): Promise<AdminContext | Response> {
  const supabase = createSupabaseServerClient(request, cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");
  return { supabase, email: user.email ?? "" };
}
