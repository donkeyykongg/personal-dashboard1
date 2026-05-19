import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCca, getRedirectUri, OUTLOOK_SCOPES, saveToken } from "@/lib/outlook/msal";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/schedule?outlook=error", req.url));
  }

  try {
    const cca = getCca();
    const result = await cca.acquireTokenByCode({
      code,
      scopes: OUTLOOK_SCOPES,
      redirectUri: getRedirectUri(),
    });

    if (!result?.accessToken) {
      return NextResponse.redirect(new URL("/schedule?outlook=error", req.url));
    }

    const supabase = createClient();
    await saveToken(supabase, {
      access_token: result.accessToken,
      refresh_token: (result as unknown as { refreshToken?: string }).refreshToken ?? null,
      expires_at:
        result.expiresOn?.toISOString() ??
        new Date(Date.now() + 30 * 60_000).toISOString(),
      account_email: result.account?.username ?? null,
    });

    return NextResponse.redirect(new URL("/schedule?outlook=connected", req.url));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.redirect(
      new URL(`/schedule?outlook=error&msg=${encodeURIComponent(msg)}`, req.url)
    );
  }
}
