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
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    url.hash ||
    !allowedHosts.includes(host) ||
    url.pathname === "/"
  ) {
    throw new Error("videoUrl is not allowed");
  }
  return url.toString();
}
