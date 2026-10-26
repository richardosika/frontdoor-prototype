import { saveReviewStep } from "@/actions/review";
import { DecisionForm, InviteDecisionForm, RevokeApprovalForm } from "@/components/decision-form";
import { ExecutiveSummary } from "@/components/grade-summary";
import { SkipStepForm } from "@/components/skip-step-form";
import { btn, btnOutline, field, labelCls } from "@/components/ui";
import { needsStrongApprovalWarning, strongApprovalWarning, unverifiedApprovalItems } from "@/lib/approval-warning";
import { verdictLabel } from "@/lib/application-status";
import { publicEvidenceHref } from "@/lib/evidence-link";
import { reviewCopy } from "@/lib/review-copy";
import type { GradeReport } from "@/lib/verify/grade";
import { previousStepId, skippedFrom, stepCountsAsPass, stepStatusLabel, type BuiltStep, type ReviewStepId } from "@/lib/review-steps";
import type { MemberReviewMode } from "@/lib/applicant-review";

export function GuidedReview({
  applicationId,
  caseId,
  steps,
  currentId,
  grade,
  paying,
  notLegit,
  confirmLabel,
  mode = "application",
  applicationStatus = null,
  verdict = "",
  role = "",
}: {
  applicationId: string;
  caseId: string;
  steps: BuiltStep[];
  currentId: ReviewStepId;
  grade: GradeReport | null;
  paying: boolean;
  notLegit: boolean;
  confirmLabel: string;
  mode?: MemberReviewMode;
  applicationStatus?: string | null;
  verdict?: string;
  role?: string;
}) {
  const current = steps.find((step) => step.id === currentId) || steps[0];
  const total = steps.length;
  const skipped = skippedFrom(steps);
  const previous = previousStepId(current.id);

  return (
    <section className="mt-4 rounded border border-line bg-paper p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Guided review</p>
      <h2 className="mt-1 font-serif text-2xl font-normal text-forest">
        Step {current.index} of {total}
      </h2>
      <p className="mt-1 text-sm text-ink">Progress is saved on this application. You can leave and come back to the same step.</p>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {steps.map((step) => (
          <form key={step.id} action={saveReviewStep}>
            <input type="hidden" name="applicationId" value={applicationId} />
            <input type="hidden" name="caseId" value={caseId} />
            <input type="hidden" name="stepId" value={step.id} />
            <input type="hidden" name="intent" value="jump" />
            <button
              className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-sm border px-3 text-xs ${
                step.id === current.id ? "border-brass bg-forest text-paper" : "border-line bg-cream text-ink"
              }`}
              type="submit"
            >
              {step.index}. {step.title}
              {step.id !== "decision" && step.status === "SKIPPED" ? " · skipped" : ""}
              {step.id !== "decision" && stepCountsAsPass(step.status) ? " · pass" : ""}
            </button>
          </form>
        ))}
      </div>
      {current.id === "decision" ? (
        <DecisionStep
          applicationId={applicationId}
          caseId={caseId}
          grade={grade}
          paying={paying}
          notLegit={notLegit}
          confirmLabel={confirmLabel}
          mode={mode}
          skipped={skipped}
          previous={previous}
          applicationStatus={applicationStatus}
          verdict={verdict}
          steps={steps}
          role={role}
        />
      ) : (
        <article className="mt-4">
          <h3 className="font-serif text-xl font-normal">{current.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink">{current.about}</p>
          <p className="mt-3 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">Status</span>
            <span className="ml-2">{stepStatusLabel(current.status)}</span>
            {!current.saved ? <span className="ml-2">Auto-suggested</span> : null}
            {current.status === "SKIPPED" || current.status === "COULDNT_VERIFY" ? <span className="ml-2 text-[#7A2E2E]">Not a pass.</span> : null}
          </p>
          <ul className="mt-3 space-y-3">
            {current.findings.length === 0 ? <li className="text-sm text-mut">No automated result for this step.</li> : null}
            {current.findings.map((finding, index) => (
              <li key={`${finding.source}-${index}`} className="rounded border border-line bg-cream p-3 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">{reviewCopy(finding.source)}</p>
                <p className="mt-1 leading-relaxed text-ink">{reviewCopy(finding.text)}</p>
                {finding.url ? (
                  <a className="mt-1 inline-flex min-h-11 items-center text-forest underline" href={publicEvidenceHref(finding.url)} target="_blank" rel="noreferrer">
                    Open evidence
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          {current.saved?.skipReason ? <p className="mt-3 text-sm text-ink">Skip reason: {current.saved.skipReason}</p> : null}
          <form action={saveReviewStep} className="mt-4 space-y-3">
            <input type="hidden" name="applicationId" value={applicationId} />
            <input type="hidden" name="caseId" value={caseId} />
            <input type="hidden" name="stepId" value={current.id} />
            <input type="hidden" name="intent" value="save" />
            <label className="block">
              <span className={labelCls}>Your mark</span>
              <select name="status" className={field} defaultValue={current.saved ? (current.status === "SKIPPED" ? "COULDNT_VERIFY" : current.status) : current.status}>
                <option value="PASS">Pass</option>
                <option value="CONCERN">Concern</option>
                <option value="FAIL">Fail</option>
                <option value="COULDNT_VERIFY">{"Couldn't verify"}</option>
                <option value="NOT_CHECKED">Not checked</option>
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Evidence link</span>
              <input name="evidenceUrl" className={field} defaultValue={publicEvidenceHref(current.saved?.evidenceUrl || current.prefill?.evidenceUrl || "")} placeholder="https://" />
            </label>
            <label className="block">
              <span className={labelCls}>Note</span>
              <textarea name="note" className={field} rows={6} defaultValue={reviewCopy(current.saved?.note || current.prefill?.note || "")} placeholder="What was found, and what was not" />
            </label>
            <button className={`${btn} min-h-11 w-full sm:w-auto`} type="submit">
              Save & next
            </button>
          </form>
          {current.index > 1 ? (
            <form action={saveReviewStep} className="mt-2">
              <input type="hidden" name="applicationId" value={applicationId} />
              <input type="hidden" name="caseId" value={caseId} />
              <input type="hidden" name="stepId" value={previous} />
              <input type="hidden" name="intent" value="jump" />
              <button className={`${btnOutline} min-h-11 w-full sm:w-auto`} type="submit">
                Back
              </button>
            </form>
          ) : null}
          <div className="mt-3">
            <SkipStepForm applicationId={applicationId} caseId={caseId} stepId={current.id} />
          </div>
        </article>
      )}
    </section>
  );
}

function DecisionStep({
  applicationId,
  caseId,
  grade,
  paying,
  notLegit,
  confirmLabel,
  mode,
  skipped,
  previous,
  applicationStatus,
  verdict,
  steps,
  role,
}: {
  applicationId: string;
  caseId: string;
  grade: GradeReport | null;
  paying: boolean;
  notLegit: boolean;
  confirmLabel: string;
  mode: MemberReviewMode;
  skipped: BuiltStep[];
  previous: ReviewStepId;
  applicationStatus: string | null;
  verdict: string;
  steps: BuiltStep[];
  role: string;
}) {
  const strongWarning = needsStrongApprovalWarning({
    letter: grade?.letter,
    recommendation: grade?.recommendation,
    verdict,
  });
  const warningText = strongApprovalWarning({
    letter: grade?.letter || "",
    verdict: verdictLabel(verdict),
    recommendation: grade?.recommendation || "",
    items: unverifiedApprovalItems({
      steps,
      attention: grade?.attention,
    }),
  });
  const canRevoke = Boolean(applicationId) && (applicationStatus === "APPROVED" || applicationStatus === "PAYMENT_DUE");
  return (
    <div className="mt-4" id="decision-step">
      <h3 className="font-serif text-xl font-normal">Your decision</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink">
        {mode === "invite"
          ? "This person asked to join and has not submitted an application. Approve sends a referral code and marks this file Verified. Request more info marks it Needs info. Decline marks it Rejected."
          : "This is a recommendation for Richard Osika. He approves every member. Approve sends the membership-dues link for a paid role, and opens the floor right away for a free role. Decline sends a short notice. The applicant does not see the grade. The file status follows this decision."}
      </p>
      {skipped.length ? (
        <div className="mt-3 rounded border border-[#7A2E2E] bg-cream p-3 text-sm" role="status">
          <p className="font-semibold text-[#7A2E2E]">Skipped steps, not counted as a pass</p>
          <ul className="mt-2 space-y-1">
            {skipped.map((step) => (
              <li key={step.id}>
                {step.title}
                {step.saved?.skipReason ? ` — ${step.saved.skipReason}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink">No steps were skipped.</p>
      )}
      {grade ? <ExecutiveSummary report={grade} role={role} /> : <p className="mt-3 text-sm text-ink">No grade yet. Re-run checks before you decide.</p>}
      {mode === "application" && applicationId ? (
        <DecisionForm
          applicationId={applicationId}
          caseId={caseId}
          notLegit={notLegit}
          confirmLabel={confirmLabel}
          paying={paying}
          strongWarning={strongWarning}
          warningText={reviewCopy(warningText)}
        />
      ) : null}
      {mode === "invite" ? <InviteDecisionForm caseId={caseId} /> : null}
      {mode === "closed" ? (
        <>
          <p className="mt-4 text-sm text-ink">This file already has a decision, or there is no open application to decide. The file status above follows that decision.</p>
          {canRevoke ? <RevokeApprovalForm applicationId={applicationId} caseId={caseId} /> : null}
        </>
      ) : null}
      <form action={saveReviewStep} className="mt-3">
        <input type="hidden" name="applicationId" value={applicationId} />
        <input type="hidden" name="caseId" value={caseId} />
        <input type="hidden" name="stepId" value={previous} />
        <input type="hidden" name="intent" value="jump" />
        <button className={`${btnOutline} min-h-11`} type="submit">
          Back
        </button>
      </form>
    </div>
  );
}
