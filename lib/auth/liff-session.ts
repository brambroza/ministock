import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "liff_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

type LiffSessionPayload = {
  profile_id: string;
  company_id: string;
  line_user_id: string;
  exp: number;
};

function getSecret() {
  return process.env.LINE_AUTH_CHANNEL_SECRET ?? process.env.LINE_CHANNEL_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev-secret";
}

function base64url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function sign(raw: string) {
  return createHmac("sha256", getSecret()).update(raw).digest("base64url");
}

export function createLiffSessionCookie(data: Omit<LiffSessionPayload, "exp">) {
  const payload: LiffSessionPayload = { ...data, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC };
  const raw = base64url(JSON.stringify(payload));
  const sig = sign(raw);
  return `${raw}.${sig}`;
}

export function parseLiffSessionCookie(value?: string | null): LiffSessionPayload | null {
  if (!value) return null;
  const [raw, sig] = value.split(".");
  if (!raw || !sig) return null;
  const expected = sign(raw);
  if (sig.length !== expected.length) return null;
  const ok = timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) return null;
  const decoded = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as LiffSessionPayload;
  if (!decoded?.exp || decoded.exp < Math.floor(Date.now() / 1000)) return null;
  if (!decoded.profile_id || !decoded.company_id || !decoded.line_user_id) return null;
  return decoded;
}

export const LIFF_SESSION_COOKIE = COOKIE_NAME;
export const LIFF_SESSION_MAX_AGE = MAX_AGE_SEC;
