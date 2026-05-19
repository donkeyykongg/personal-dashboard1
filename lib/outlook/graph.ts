import "isomorphic-fetch";
import { Client } from "@microsoft/microsoft-graph-client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAccessToken } from "./msal";

export async function getGraphClient(supabase: SupabaseClient): Promise<Client | null> {
  const token = await getAccessToken(supabase);
  if (!token) return null;
  return Client.init({
    authProvider: (done) => done(null, token),
  });
}

export type GraphEvent = {
  id: string;
  subject: string;
  body?: { content?: string; contentType?: string };
  bodyPreview?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName?: string };
  lastModifiedDateTime?: string;
};
