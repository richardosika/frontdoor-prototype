import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { moderationActionLabel } from "@/lib/moderation-label";

describe("admin invite labels", () => {
  it("shows a request-to-join label and leaves the stored action alone", () => {
    expect(moderationActionLabel("DELETE_INVITE_REQUEST")).toBe("Delete request to join");
    expect(moderationActionLabel("DELETE_OUTBOX_NOTICE")).toBe("DELETE_OUTBOX_NOTICE");
    const writer = readFileSync(path.join(__dirname, "../src/actions/admin.ts"), "utf8");
    expect(writer).toContain('action: "DELETE_INVITE_REQUEST"');
  });

  it("rewords only the stored info-template history subjects", () => {
    const sql = readFileSync(
      path.join(__dirname, "../prisma/migrations/20261028180000_info_template_history_subject/migration.sql"),
      "utf8",
    );
    expect(sql).toContain("UPDATE");
    expect(sql).not.toMatch(/\bDELETE\b/i);
    expect(sql).toContain("template.key = 'info'");
    expect(sql).toContain("version.version IN (1, 2)");
    expect(sql).toContain("You''re invited to Private Floor");
    expect(sql).toContain("About Private Floor");
    expect(sql).not.toContain("OutboxNotice");
  });
});
