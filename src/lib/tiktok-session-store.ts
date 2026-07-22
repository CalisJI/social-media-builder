import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import crypto from "node:crypto";
import {
  accessTokenNeedsRefresh,
  decryptSession,
  encryptSession,
  refreshTikTokSession,
  TikTokSession,
} from "@/lib/tiktok";

let queue: Promise<void> = Promise.resolve();

function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation, operation);
  queue = result.then(() => undefined, () => undefined);
  return result;
}

function sessionFile(): string {
  const value = process.env.TIKTOK_SESSION_FILE;
  if (!value) throw new Error("TIKTOK_SESSION_FILE is not configured");
  return value;
}

async function writeSession(session: TikTokSession): Promise<void> {
  const target = sessionFile();
  const directory = dirname(target);
  const temporary = `${target}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(temporary, encryptSession(session), { encoding: "utf8", mode: 0o600 });
  await rename(temporary, target);
}

export function storeTikTokSession(session: TikTokSession): Promise<void> {
  return serialized(() => writeSession(session));
}

export function loadFreshTikTokSession(): Promise<TikTokSession | null> {
  return serialized(async () => {
    let encrypted: string;
    try {
      encrypted = await readFile(sessionFile(), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    let session = decryptSession(encrypted.trim());
    if (!session) return null;
    if (accessTokenNeedsRefresh(session)) {
      session = await refreshTikTokSession(session);
      await writeSession(session);
    }
    return session;
  });
}

export function clearStoredTikTokSession(): Promise<void> {
  return serialized(async () => {
    try {
      await unlink(sessionFile());
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  });
}
