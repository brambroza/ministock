import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export async function GET() {
  const channelId = process.env.LINE_AUTH_CHANNEL_ID ?? process.env.LINE_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json({ error: "LINE_AUTH_CHANNEL_ID is missing" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL is missing" }, { status: 500 });
  }

  const state = randomUUID();
  const nonce = randomUUID();
  const redirectUri = `${appUrl}/api/auth/line/callback`;

  const url = new URL("https://access.line.me/oauth2/v2.1/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", channelId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("nonce", nonce);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("line_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600
  });
  res.cookies.set("line_oauth_nonce", nonce, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600
  });

  return res;
}
