import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { auditRunScore, rerunFinishedSummary, rerunGradeFields } from "@/lib/rerun-audit";

const ROOT = path.resolve(__dirname, "../src");

describe("re-run checks audit", () => {
  it("writes the new grade and the same score the file shows", () => {
    const grade = { letter: "F", score: 49, confidence: "Low", recommendation: "NEEDS MORE INFO" };
    const fields = rerunGradeFields(grade);
    expect(fields.score).toBe(49);
    expect(fields.gradeScore).toBe(49);
    expect(fields.gradeLetter).toBe("F");
    expect(fields.score).toBe(fields.gradeScore);
    expect(rerunFinishedSummary(grade)).toBe(
      "Checks finished. Grade F (49). The same grade is on this file and on the application.",
    );
    expect(rerunFinishedSummary(null)).toBe("Checks finished. No new grade was stored.");
    expect(auditRunScore({ score: 54, gradeScore: 49 })).toBe(49);
    expect(auditRunScore({ score: 54, gradeScore: null })).toBe(54);
    expect(auditRunScore({})).toBeNull();

    const action = readFileSync(path.join(ROOT, "actions/verification.ts"), "utf8");
    const rerun = action.slice(action.indexOf("export async function rerunGuidedChecks"));
    expect(rerun).toContain("rerunGradeFields(grade)");
    expect(rerun).toContain("moderationEvent.create");
    expect(rerun).toContain('action: "RERUN_CHECKS"');
    expect(rerun).toContain("verificationEvent.create");
    expect(rerun.indexOf("verificationRun.updateMany")).toBeLessThan(rerun.indexOf("moderationEvent.create"));
    const audit = readFileSync(path.join(ROOT, "app/(app)/admin/audit/page.tsx"), "utf8");
    expect(audit).toContain("auditRunScore");
    expect(audit).toContain("gradeScore");
    expect(audit).toContain("Grade ");
  });
});