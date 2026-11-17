import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contactRequestHref, inTalks } from "@/lib/my-work";
import { phrase } from "@/lib/i18n/phrases";

const own = [{ id: "own" }, { id: "second" }];
const request = (id: string, status = "PENDING") => ({ status, project: { id } });
const source = (path: string) => readFileSync(path, "utf8");

describe("Nov 17 Julia fixes", () => {
  it("keeps the developer destination", () => {
    expect(contactRequestHref(true, 1, own, [request("own")])).toBe("/projects#interest");
  });
  it("uses My work when no pending requests are on own projects", () => {
    expect(contactRequestHref(false, 1, own, [request("other"), request("own", "ACCEPTED")])).toBe("#ledger-my-work");
    expect(contactRequestHref(false, 0, own, [])).toBe("#ledger-my-work");
  });
  it("uses Your projects for mixed requests, multiple own projects, or partial received rows", () => {
    for (const rows of [[request("own"), request("other")], [request("own"), request("second")], [request("own")]]) {
      expect(contactRequestHref(false, 2, own, rows)).toBe("#ledger-your-projects");
    }
  });
  it("opens the single own project when all pending requests belong to it", () => {
    expect(contactRequestHref(false, 2, own, [request("own"), request("own"), request("other", "DECLINED")])).toBe("/projects/own#interest");
  });
  it("renders the own-project anchor and pending chip destination", () => {
    const ledger = source("src/components/ledger-projects.tsx");
    expect(ledger).toContain('id="ledger-your-projects"');
    const block = ledger.split('data-testid="my-work-own-projects"')[1].split('<details')[0];
    expect(block).toContain('row.project.id === project.id && row.status === "PENDING"');
    expect(block).toContain('href={`/projects/${project.id}#interest`}');
    expect(block).toContain('data-testid="project-waiting-chip"');
  });
  it("reports card uploads and displays saved card metadata", () => {
    expect(source("src/actions/profile.ts")).toContain('cardUploaded ? "Profile saved. Business card uploaded." : "Profile saved"');
    const editor = source("src/components/profile-editor.tsx");
    expect(editor).toContain('data-testid="business-card-on-file"');
    expect(editor).toContain('data-testid="business-card-none"');
    expect(editor).toContain('select: { fileName: true, uploadedAt: true }');
    expect(editor).toContain('timeZone: "America/New_York"');
    expect(source("src/app/(app)/profile/page.tsx")).toContain('tx(params.notice)');
  });
  it("translates every added string and both chip labels", () => {
    for (const locale of ["es", "de", "ja"] as const) {
      for (const text of ["Profile saved. Business card uploaded.", "On file: {fileName} · uploaded {date}", "No business card on file.", "interest request waiting", "interest requests waiting"]) {
        expect(phrase(locale, text)).not.toBe(text);
      }
    }
  });
  it("keeps a waiting request inside the 8-row In talks cut", () => {
    const d = (n: number) => new Date(Date.now() - n * 3600_000);
    const rows = [...Array.from({ length: 9 }, (_, i) => ({ id: `s${i}`, status: "PENDING", fromId: "me", createdAt: d(i + 1) })), { id: "old", status: "PENDING", fromId: "sub", createdAt: d(200) }];
    expect(inTalks(rows, "me").slice(0, 8)[0]).toMatchObject({ id: "old", state: "Received" });
  });
});
