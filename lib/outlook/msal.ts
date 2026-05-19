import { ConfidentialClientApplication, type Configuration } from "@azure/msal-node";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OauthToken } from "@/lib/supabase/types";

export const OUTLOOK_SCOPES = [
  "Calendars.ReadWrite",
  "User.Read",
  "offline_access",
];

export function getMsalConfig(): Configuration {
  const tenant = process.env.MS_TENANT_ID || "common";
  return {
    auth: {
      clientId: process.env.MS_CLIENT_ID!,
      authority: `https://login.microsoftonline.com/${tenant}`,
      clientSecret: process.env.MS_CLIENT_SECRET!,
    },
  };
}

export function getRedirectUri() {
  return (
    process.env.MS_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/outlook/callback`
  );
}

export function getCca() {
  return new ConfidentialClientApplication(getMsalConfig());
}

export async function loadToken(supabase: SupabaseClient): Promise<OauthToken | null> {
  const { data } = await supabase
    .from("oauth_tokens")
    .select("*")
    .eq("provider", "outlook")
    .maybeSingle();
  return (data as OauthToken | null) ?? null;
}

export async function saveToken(
  supabase: SupabaseClient,
  token: Partial<OauthToken> & {
    access_token: string;
    expires_at: string;
    refresh_token?: string | null;
    account_email?: string | null;
  }
) {
  const payload: Record<string, unknown> = {
    provider: "outlook",
    access_token: token.access_token,
    expires_at: token.expires_at,
    updated_at: new Date().toISOString(),
  };
  if (token.refresh_token !== undefined) payload.refresh_token = token.refresh_token;
  if (token.account_email !== undefined) payload.account_email = token.account_email;
  if (token.delta_link !== undefined) payload.delta_link = token.delta_link;
  await supabase.from("oauth_tokens").upsert(payload, { onConflict: "provider" });
}

export async function getAccessToken(supabase: SupabaseClient): Promise<string | null> {
  const tok = await loadToken(supabase);
  if (!tok) return null;
  const expiresAt = new Date(tok.expires_at).getTime();
  if (expiresAt - Date.now() > 60_000) return tok.access_token;

  if (!tok.refresh_token) return null;
  const cca = getCca();
  const result = await cca.acquireTokenByRefreshToken({
    refreshToken: tok.refresh_token,
    scopes: OUTLOOK_SCOPES,
  });
  if (!result?.accessToken) return null;
  await saveToken(supabase, {
    access_token: result.accessToken,
    expires_at: result.expiresOn?.toISOString() ?? new Date(Date.now() + 30 * 60_000).toISOString(),
    refresh_token: (result as unknown as { refreshToken?: string }).refreshToken ?? tok.refresh_token,
  });
  return result.accessToken;
}
