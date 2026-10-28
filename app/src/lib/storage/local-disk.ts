import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DealStorage, ExpiringLink, StoredFile } from "@/lib/storage/types";

function secret(): string {
  return process.env.AUTH_SECRET || "dev-file-link";
}

export class LocalDiskStorage implements DealStorage {
  readonly mode = "local" as const;

  constructor(private readonly root: string) {}

  private resolve(key: string): string | null {
    if (!key.startsWith("deals/") || key.includes("..")) return null;
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root))) return null;
    return full;
  }

  async put(file: StoredFile): Promise<void> {
    const full = this.resolve(file.key);
    if (!full) throw new Error("That storage key is not allowed.");
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, file.bytes);
  }

  async read(key: string): Promise<Uint8Array | null> {
    const full = this.resolve(key);
    if (!full) return null;
    try {
      return await readFile(full);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const full = this.resolve(key);
    if (!full) return;
    await rm(full, { force: true });
  }

  expiringLink(key: string, ttlSeconds: number): ExpiringLink {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const payload = `${key}.${expiresAt.getTime()}`;
    const sig = createHmac("sha256", secret()).update(payload).digest("hex");
    return { ok: true, href: `?exp=${expiresAt.getTime()}&sig=${sig}`, expiresAt };
  }
}

export function localLinkValid(key: string, exp: string, sig: string, now = Date.now()): boolean {
  const expires = Number(exp);
  if (!Number.isFinite(expires) || expires < now) return false;
  const payload = `${key}.${expires}`;
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function localDealStorage(): LocalDiskStorage {
  const root = process.env.DEAL_STORAGE_DIR || path.join(process.cwd(), ".deal-files");
  return new LocalDiskStorage(root);
}
