import type { DealStorage, ExpiringLink, StoredFile } from "@/lib/storage/types";

/**
 * Private object storage is not connected.
 * This stub does not read cloud credentials and does not upload anything.
 * Choose a host before this can issue a real expiring link.
 */
export class ObjectStorageStub implements DealStorage {
  readonly mode = "object" as const;
  private readonly reason = "Private object storage is not configured. No cloud credentials are used.";

  async put(_file: StoredFile): Promise<void> {
    throw new Error(this.reason);
  }

  async read(_key: string): Promise<Uint8Array | null> {
    throw new Error(this.reason);
  }

  async delete(_key: string): Promise<void> {
    throw new Error(this.reason);
  }

  expiringLink(_key: string, _ttlSeconds: number): ExpiringLink {
    return { ok: false, reason: this.reason };
  }
}
