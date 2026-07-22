import crypto from "node:crypto";

export const TIKTOK_API = "https://open.tiktokapis.com";
export const SESSION_COOKIE = "smb_tiktok_session";
export const STATE_COOKIE = "smb_tiktok_oauth_state";

export class TikTokApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly logId?: string,
  ) {
    super(message);
    this.name = "TikTokApiError";
  }
}

export type TikTokSession = {
  accessToken: string;
  openId: string;
  accessExpiresAt: number;
  refreshToken?: string;
  refreshExpiresAt?: number;
};

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  open_id?: string;
  refresh_expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
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
    const parsed = JSON.parse(decrypted.toString("utf8")) as TikTokSession & {
      expiresAt?: number;
    };
    const session: TikTokSession = {
      accessToken: parsed.accessToken,
      openId: parsed.openId,
      accessExpiresAt: parsed.accessExpiresAt ?? parsed.expiresAt ?? 0,
      refreshToken: parsed.refreshToken,
      refreshExpiresAt: parsed.refreshExpiresAt,
    };
    if (!session.accessToken || !session.openId) return null;
    const usableUntil = session.refreshToken
      ? session.refreshExpiresAt ?? session.accessExpiresAt
      : session.accessExpiresAt;
    return usableUntil > Date.now() ? session : null;
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

export function sessionCookieMaxAge(session: TikTokSession): number {
  const expiresAt = session.refreshToken
    ? session.refreshExpiresAt ?? session.accessExpiresAt
    : session.accessExpiresAt;
  return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
}

export function accessTokenNeedsRefresh(session: TikTokSession): boolean {
  return session.accessExpiresAt <= Date.now() + 5 * 60 * 1000;
}

export async function refreshTikTokSession(session: TikTokSession): Promise<TikTokSession> {
  if (!session.refreshToken || (session.refreshExpiresAt ?? 0) <= Date.now()) {
    throw new Error("TikTok session expired. Connect TikTok again.");
  }
  const { clientKey, clientSecret } = oauthConfig();
  const response = await fetch(`${TIKTOK_API}/v2/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: session.refreshToken,
    }),
    cache: "no-store",
  });
  const token = (await response.json()) as TokenResponse;
  if (!response.ok || !token.access_token) {
    throw new Error("TikTok token refresh failed. Connect TikTok again.");
  }
  const now = Date.now();
  return {
    accessToken: token.access_token,
    openId: token.open_id ?? session.openId,
    accessExpiresAt: now + (token.expires_in ?? 86400) * 1000,
    refreshToken: token.refresh_token ?? session.refreshToken,
    refreshExpiresAt: token.refresh_expires_in
      ? now + token.refresh_expires_in * 1000
      : session.refreshExpiresAt,
  };
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
    const code = payload.error?.code || `http_${response.status}`;
    const logId = payload.error?.log_id;
    const detail = [
      payload.error?.message || `TikTok API returned ${response.status}`,
      `Code: ${code}`,
      logId ? `Log ID: ${logId}` : "",
    ].filter(Boolean).join(" · ");
    throw new TikTokApiError(detail, code, logId);
  }
  return payload;
}
