import crypto from "node:crypto";

export const TIKTOK_API = "https://open.tiktokapis.com";
export const SESSION_COOKIE = "smb_tiktok_session";
export const STATE_COOKIE = "smb_tiktok_oauth_state";

export type TikTokSession = {
  accessToken: string;
  openId: string;
  expiresAt: number;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function key(): Buffer {
  return crypto.createHash("sha256").update(required("SESSION_SECRET")).digest();
}

export function encryptSession(session: TikTokSession): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptSession(value?: string): TikTokSession | null {
  if (!value) return null;
  try {
    const [ivValue, tagValue, dataValue] = value.split(".");
    if (!ivValue || !tagValue || !dataValue) return null;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataValue, "base64url")),
      decipher.final(),
    ]);
    const session = JSON.parse(decrypted.toString("utf8")) as TikTokSession;
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export function oauthConfig() {
  const environment = process.env.TIKTOK_ENV === "production" ? "PROD" : "SANDBOX";
  return {
    clientKey: required(`${environment}_TIKTOK_CLIENT_KEY`),
    clientSecret: required(`${environment}_TIKTOK_CLIENT_SECRET`),
    redirectUri: required("TIKTOK_REDIRECT_URI"),
  };
}

export function publicOrigin(): string {
  return new URL(required("TIKTOK_REDIRECT_URI")).origin;
}

export async function tiktokFetch<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${TIKTOK_API}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      ...init.headers,
    },
  });
  const payload = (await response.json()) as T & {
    error?: { code?: string; message?: string; log_id?: string };
  };
  if (!response.ok || (payload.error?.code && payload.error.code !== "ok")) {
    throw new Error(payload.error?.message || `TikTok API returned ${response.status}`);
  }
  return payload;
}
