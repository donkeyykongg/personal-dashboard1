import { NextResponse } from "next/server";
import { getCca, getRedirectUri, OUTLOOK_SCOPES } from "@/lib/outlook/msal";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!process.env.MS_CLIENT_ID || !process.env.MS_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL(
        "/schedule?outlook=error&msg=Missing%20MS_CLIENT_ID%20or%20MS_CLIENT_SECRET%20in%20.env.local",
        req.url
      )
    );
  }
  const cca = getCca();
  const url = await cca.getAuthCodeUrl({
    scopes: OUTLOOK_SCOPES,
    redirectUri: getRedirectUri(),
    prompt: "select_account",
  });
  return NextResponse.redirect(url);
}
