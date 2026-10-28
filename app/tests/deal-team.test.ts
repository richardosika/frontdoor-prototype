import { describe, expect, it } from "vitest";
import { ObjectStorageStub } from "@/lib/storage/object-stub";
import { LocalDiskStorage, localLinkValid } from "@/lib/storage/local-disk";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  accessStatusToTeam,
  canAddToDealTeam,
  documentsOpen,
  fileAllowed,
  folderVisible,
  parseDocSettings,
  publicRaiseLabel,
  safeStorageKey,
  teamRoleForMember,
  PLATFORM_NDA_NOTICE,
  DEFAULT_DOC_MAX_MB,
} from "@/lib/platform/deal-team";

describe("deal team", () => {
  it("maps the older access statuses and member roles", () => {
    expect(accessStatusToTeam("PENDING")).toBe("REQUESTED");
    expect(accessStatusToTeam("APPROVED")).toBe("ADDED");
    expect(accessStatusToTeam("REJECTED")).toBe("DECLINED");
    expect(accessStatusToTeam("REMOVED")).toBe("REMOVED");
    expect(teamRoleForMember("GENERAL_CONTRACTOR")).toBe("GC");
    expect(teamRoleForMember("RE_ATTORNEY")).toBe("ATTORNEY");
    expect(teamRoleForMember("INVESTOR_PE")).toBe("INVESTOR");
  });

  it("lets a sponsor add only someone they can already message", () => {
    expect(canAddToDealTeam({ isSponsor: true, hasIntro: true, hasThread: false, blocked: false }).ok).toBe(true);
    expect(canAddToDealTeam({ isSponsor: true, hasIntro: false, hasThread: true, blocked: false }).ok).toBe(true);
    expect(canAddToDealTeam({ isSponsor: false, hasIntro: true, hasThread: true, blocked: false }).ok).toBe(false);
    expect(canAddToDealTeam({ isSponsor: true, hasIntro: false, hasThread: false, blocked: false }).ok).toBe(false);
    expect(canAddToDealTeam({ isSponsor: true, hasIntro: true, hasThread: true, blocked: true }).ok).toBe(false);
  });

  it("keeps documents closed until the platform acknowledgement is recorded", () => {
    expect(documentsOpen({ isSponsor: true, teamStatus: null, ndaAckAt: null })).toBe(true);
    expect(documentsOpen({ isSponsor: false, teamStatus: "REQUESTED", ndaAckAt: null })).toBe(false);
    expect(documentsOpen({ isSponsor: false, teamStatus: "ADDED", ndaAckAt: null })).toBe(false);
    expect(documentsOpen({ isSponsor: false, teamStatus: "ADDED", ndaAckAt: new Date() })).toBe(true);
    expect(PLATFORM_NDA_NOTICE.toLowerCase()).toContain("counsel review");
  });

  it("hides equity raise figures on the public line and keeps a unit size", () => {
    expect(publicRaiseLabel({ kind: "DEAL", raiseLabel: "$4M", sizeLabel: "$1–5M" })).toBe("$1–5M");
    expect(publicRaiseLabel({ kind: "SEEKING", raiseLabel: "120 units", sizeLabel: "Scope" })).toBe("120 units");
    expect(publicRaiseLabel({ kind: "SEEKING", raiseLabel: "$3.2M", sizeLabel: "$1–5M" })).toBe("$1–5M");
  });

  it("limits a folder to the roles on it", () => {
    expect(folderVisible({ isSponsor: false, teamRole: "GC", audience: ["ATTORNEY"], sponsorOnly: false })).toBe(false);
    expect(folderVisible({ isSponsor: false, teamRole: "GC", audience: [], sponsorOnly: false })).toBe(true);
    expect(folderVisible({ isSponsor: false, teamRole: "GC", audience: [], sponsorOnly: true })).toBe(false);
    expect(folderVisible({ isSponsor: true, teamRole: null, audience: ["ATTORNEY"], sponsorOnly: true })).toBe(true);
  });
});

describe("deal files", () => {
  const settings = parseDocSettings([]);

  it("uses the default size and refuses a type that is not on the list", () => {
    expect(settings.maxMb).toBe(DEFAULT_DOC_MAX_MB);
    expect(fileAllowed({ fileName: "plan.pdf", contentType: "application/pdf", sizeBytes: 1000 }, settings).ok).toBe(true);
    expect(fileAllowed({ fileName: "plan.txt", contentType: "text/plain", sizeBytes: 1000 }, settings).ok).toBe(false);
    expect(fileAllowed({ fileName: "big.pdf", contentType: "application/pdf", sizeBytes: 26 * 1024 * 1024 }, settings).ok).toBe(false);
    const custom = parseDocSettings([{ key: "doc.maxMb", value: { n: 2 } }]);
    expect(fileAllowed({ fileName: "a.pdf", contentType: "application/pdf", sizeBytes: 3 * 1024 * 1024 }, custom).ok).toBe(false);
  });

  it("stores a file on local disk and refuses the object stub without credentials", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "pf-files-"));
    const disk = new LocalDiskStorage(root);
    await disk.put({ key: "deals/deal1/doc1", bytes: new Uint8Array([1, 2, 3]), contentType: "application/pdf" });
    const read = await disk.read("deals/deal1/doc1");
    expect(Array.from(read || [])).toEqual([1, 2, 3]);
    expect(await disk.read("deals/../secret")).toBeNull();
    const link = disk.expiringLink("deals/deal1/doc1", 60);
    expect(link.ok).toBe(true);
    if (link.ok) {
      const url = new URL(`http://localhost/${link.href}`);
      expect(localLinkValid("deals/deal1/doc1", url.searchParams.get("exp") || "", url.searchParams.get("sig") || "")).toBe(true);
    }
    await disk.delete("deals/deal1/doc1");
    expect(await disk.read("deals/deal1/doc1")).toBeNull();
    await rm(root, { recursive: true, force: true });
    const stub = new ObjectStorageStub();
    expect(stub.expiringLink("deals/a/b", 60).ok).toBe(false);
    await expect(stub.put({ key: "deals/a/b", bytes: new Uint8Array([1]), contentType: "application/pdf" })).rejects.toThrow(/not configured/);
    expect(safeStorageKey("deal_1", "doc_1")).toBe("deals/deal_1/doc_1");
    expect(safeStorageKey("../x", "y")).toBeNull();
  });
});
