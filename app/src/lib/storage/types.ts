export type StoredFile = { key: string; bytes: Uint8Array; contentType: string };

export type ExpiringLink = { ok: true; href: string; expiresAt: Date } | { ok: false; reason: string };

/** Deal files. Local disk is for this machine. Object storage is a stub until a host is chosen. */
export interface DealStorage {
  readonly mode: "local" | "object";
  put(file: StoredFile): Promise<void>;
  read(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
  expiringLink(key: string, ttlSeconds: number): ExpiringLink;
}
