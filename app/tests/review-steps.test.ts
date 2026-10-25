import { describe, expect, it } from "vitest";
import { applyReviewSkips, RUBRIC_VERSION, type GradeReport } from "@/lib/verify/grade";
import {
  buildReviewSteps,
  displayCheckStatus,
  emptyProgress,
  parseReviewProgress,
  publicFinding,
  stepCountsAsPass,
} from "@/lib/review-steps";

function report(confidence: GradeReport["confidence"]): GradeReport {
  const summary = {
    applicant: "Sample applicant.",
    company: "Sample company.",
    checkedOut: "Nothing in the checks that ran confirmed a fact about this person or company.",
    didNotCheckOut: "Nothing in the checks that ran showed a direct conflict.",
    couldNotCheck: "Paid sources were not checked.",
    reasoning: "Ask for more.",
    nextStep: "Ask for a LinkedIn URL.",
  };
  return {
    version: 1,
    rubricVersion: RUBRIC_VERSION,
    gradedAt: "2026-10-25T00:00:00.000Z",
    letter: "B",
    score: 82,
    rawScore: 82,
    confidence,
    recommendation: "NEEDS MORE INFO",
    categories: [],
    attention: [],
    summary,
    banner: null,
    caps: [],
    changeNote: "First graded run.",
    plainText: "",
  };
}

describe("guided review steps", () => {
  it("does not describe an unconfirmed check as verified", () => {
    expect(publicFinding("INCONCLUSIVE", "SEC EDGAR returned a hit")).toMatch(/^Not confirmed\./);
    expect(publicFinding("NOT_RUN", "No search ran")).toMatch(/^Not confirmed\./);
    expect(publicFinding("PASS", "The company site names them.")).toBe("The company site names them.");
    expect(publicFinding("INCONCLUSIVE", "SEC EDGAR returned a hit")).not.toMatch(/checked out/i);
  });

  it("keeps a skip from counting as a pass and lowers confidence without raising the grade", () => {
    const steps = buildReviewSteps({
      evidence: [
        { checkKey: "website", status: "PASS", finding: "The site names them.", source: "Website", url: "https://example.com" },
        { checkKey: "sanctions", status: "INCONCLUSIVE", finding: "No corroborated sanctions hit.", source: "Sanctions", url: "" },
      ],
      saved: {
        ...emptyProgress(),
        steps: {
          risk: { status: "SKIPPED", note: "", evidenceUrl: "", skipReason: "List was down", updatedAt: "2026-10-25T00:00:00.000Z" },
        },
      },
      references: [],
      cardOnFile: false,
    });
    const risk = steps.find((step) => step.id === "risk");
    const company = steps.find((step) => step.id === "company");
    expect(risk?.status).toBe("SKIPPED");
    expect(stepCountsAsPass(risk?.status || "NOT_CHECKED")).toBe(false);
    expect(company?.status).toBe("PASS");
    expect(company?.findings.some((item) => item.text.startsWith("Not confirmed"))).toBe(false);

    const graded = applyReviewSkips(report("High"), [{ title: "Sanctions and risk", reason: "List was down" }]);
    expect(graded.letter).toBe("B");
    expect(graded.score).toBe(82);
    expect(graded.confidence).toBe("Medium");
    expect(graded.attention[0]?.detail).toMatch(/not a pass/i);
    expect(graded.plainText).toMatch(/not a pass/i);
    expect(applyReviewSkips(report("Low"), [{ title: "News", reason: "Ambiguous" }]).confidence).toBe("Low");
  });

  it("resumes at the saved step and treats a checklist skip as skipped", () => {
    const saved = parseReviewProgress({ version: 1, current: "news", steps: { card: { status: "NOT_CHECKED", note: "", evidenceUrl: "", skipReason: "", updatedAt: "" } } });
    expect(saved.current).toBe("news");
    expect(displayCheckStatus("NOT_PROVIDED", "Skipped: no card on file")).toBe("Skipped");
    expect(displayCheckStatus("PASS", "Looked fine")).toBe("Pass");
    expect(displayCheckStatus("PENDING", "")).toBe("Not checked");
  });
});
