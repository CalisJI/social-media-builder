import crypto from "node:crypto";

function serviceToken(): string {
  const value = process.env.N8N_SERVICE_TOKEN;
  if (!value || value.length < 32) {
    throw new Error("N8N_SERVICE_TOKEN must contain at least 32 characters");
  }
  return value;
}

export function isAuthorizedServiceRequest(request: Request): boolean {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorization.slice(7), "utf8");
  const expected = Buffer.from(serviceToken(), "utf8");
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

export function validateMediaUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) {
    throw new Error("videoUrl must be a valid HTTPS URL");
  }
  const allowedHosts = (process.env.N8N_MEDIA_ALLOWED_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (!allowedHosts.length) throw new Error("N8N_MEDIA_ALLOWED_HOSTS is not configured");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("videoUrl must be a valid HTTPS URL");
  }
  const host = url.hostname.toLowerCase();
  const allowedPrefixes = (process.env.N8N_MEDIA_ALLOWED_PREFIXES || "/cal-3/")
    .split(",")
    .map((prefix) => prefix.trim())
    .filter(Boolean)
    .map((prefix) => prefix.startsWith("/") ? prefix : `/${prefix}`);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    url.hash ||
    !allowedHosts.includes(host) ||
    !allowedPrefixes.some((prefix) => url.pathname.startsWith(prefix)) ||
    url.pathname === "/"
  ) {
    throw new Error("videoUrl is not allowed");
  }
  return url.toString();
}

export async function validateRemoteMedia(videoUrl: string): Promise<void> {
  const configuredMaxBytes = Number(process.env.N8N_MEDIA_MAX_BYTES || 524_288_000);
  if (!Number.isSafeInteger(configuredMaxBytes) || configuredMaxBytes <= 0) {
    throw new Error("N8N_MEDIA_MAX_BYTES must be a positive integer");
  }

  const response = await fetch(videoUrl, {
    method: "HEAD",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Media URL returned HTTP ${response.status}`);

  const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "video/mp4") throw new Error("Media URL must return Content-Type video/mp4");

  const contentLength = Number(response.headers.get("content-length"));
  if (!Number.isSafeInteger(contentLength) || contentLength <= 0) {
    throw new Error("Media URL must return a valid Content-Length");
  }
  if (contentLength > configuredMaxBytes) {
    throw new Error(`Media file exceeds the ${configuredMaxBytes}-byte limit`);
  }
}
