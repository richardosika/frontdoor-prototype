import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { approvalNoticeClosesDialog } from "@/lib/decision-dialog";

const ROOT = path.resolve(__dirname, "../src");

describe("the approve dialog closes when the notice arrives", () => {
  it("closes a request-only file and leaves a step-save notice alone", () => {
    expect(approvalNoticeClosesDialog("Referral code issued for qa@example.com. Code: PF-AB12. This file is Verified.")).toBe(true);
    expect(approvalNoticeClosesDialog("Declined")).toBe(true);
    expect(approvalNoticeClosesDialog("Asked for more info. This file is Needs info.")).toBe(true);
    expect(approvalNoticeClosesDialog("Checklist saved")).toBe(false);
    expect(approvalNoticeClosesDialog("Skip recorded. It is not a pass.")).toBe(false);
    expect(approvalNoticeClosesDialog("")).toBe(false);
  });

  it("closes a full application file", () => {
    expect(approvalNoticeClosesDialog("Approved QA-TEST Mary Ann Smith")).toBe(true);
    expect(approvalNoticeClosesDialog("Approved, payment due — QA-TEST Paid Smith")).toBe(true);
    expect(approvalNoticeClosesDialog("Declined")).toBe(true);
    expect(approvalNoticeClosesDialog("Asked for more info")).toBe(true);
    expect(approvalNoticeClosesDialog("Verification finished. Live sources may differ from the offline sample.")).toBe(false);
  });

  it("uses that notice check in the dialog that stays up while saving", () => {
    const host = readFileSync(path.join(ROOT, "components/decision-dialog-host.tsx"), "utf8");
    expect(host).toContain("approvalNoticeClosesDialog");
    expect(host).toContain("Saving approval...");
    expect(host).toContain("useSearchParams");
    const dialog = readFileSync(path.join(ROOT, "lib/decision-dialog.ts"), "utf8");
    expect(dialog).toContain("referral code issued");
    expect(dialog).not.toContain("appendChild");
  });
});
