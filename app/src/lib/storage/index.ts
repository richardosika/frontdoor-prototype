import { localDealStorage } from "@/lib/storage/local-disk";
import { ObjectStorageStub } from "@/lib/storage/object-stub";
import type { DealStorage } from "@/lib/storage/types";

/** `DEAL_STORAGE=object` selects the stub. The default is the local disk. */
export function dealStorage(): DealStorage {
  if (process.env.DEAL_STORAGE === "object") return new ObjectStorageStub();
  return localDealStorage();
}
