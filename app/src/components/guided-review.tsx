import { saveReviewStep } from "@/actions/review";
import { DecisionForm, RevokeApprovalForm, SettleDecision } from "@/components/decision-form";
import { ExecutiveSummary, GradeMark } from "@/components/grade-summary";
import { ReviewStepFrame, StepJumpForm } from "@/components/guided-step-switcher";
import { SkipStepForm } from "@/components/skip-step-form";
import { StepSaveForm } from "@/components/step-save-form";
import { btn, btnOutline, field, labelCls } from "@/components/ui";
import { approvalAttentionDetail, approvalAttentionTitle, approvalDialogVerdict, approvalItemLists, needsStrongApprovalWarning, strongApprovalWarning } from "@/lib/approval-warning";
import { decisionDialogBootstrap } from "@/lib/decision-dialog";
import { publicEvidenceHref } from "@/lib/evidence-link";
import { reviewCopy } from "@/lib/review-copy";
import { shownRegistryCheck } from "@/lib/state-registry-search";
import { gradeComparisonLine, type GradeReport } from "@/lib/verify/grade";
import { displayedCheckFinding, previousStepId, skippedFrom, stepCountsAsPass, stepStatusLabel, type BuiltStep, type ReviewStepId } from "@/lib/review-steps";
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
  location = "",
  unverified = [],
  applicationGrade = null,
  person = "",
  org = "",
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
  location?: string;
  unverified?: string[];
  applicationGrade?: { letter: string; score: number } | null;
  person?: string;
  org?: string;
}) {
  const current = steps.find((step) => step.id === currentId) || steps[0];
  const total = steps.length;
  const skipped = skippedFrom(steps);

  return (
    <section className="mt-4 rounded border border-line bg-paper p-4">
      <script dangerouslySetInnerHTML={{ __html: decisionDialogBootstrap() }} />
      <SettleDecision applicationId={applicationId} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Guided review</p>
      <ReviewStepFrame currentId={current.id}>
        <h2 className="mt-1 font-serif text-2xl font-normal text-forest" data-review-heading data-total={total}>
          Step {current.index} of {total}
        </h2>
        <p className="mt-1 text-sm text-ink">Progress is saved on this application. You can leave and come back to the same step.</p>
        {grade ? (
          <div className="mt-3">
            <GradeMark letter={grade.letter} score={grade.score} recommendation={grade.recommendation} confidence={grade.confidence} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink" data-grade-pending="1">Checking...</p>
        )}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {steps.map((step) => (
            <StepJumpForm key={step.id} applicationId={applicationId} caseId={caseId} stepId={step.id}>
              <button
                className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-sm border px-3 text-xs ${
                  step.id === current.id ? "border-brass bg-forest text-paper" : "border-line bg-cream text-ink"
                }`}
                data-review-tab={step.id}
                type="submit"
              >
                {step.index}. {step.title}
                {step.id !== "decision" && step.status === "SKIPPED" ? " · skipped" : ""}
                {step.id !== "decision" && stepCountsAsPass(step.status) ? " · pass" : ""}
              </button>
            </StepJumpForm>
          ))}
        </div>
        {steps.map((step) =>
          step.id === "decision" ? (
            <div key={step.id} data-review-step={step.id} data-step-index={step.index} hidden={step.id !== current.id}>
              <DecisionStep
                applicationId={applicationId}
                caseId={caseId}
                grade={grade}
                paying={paying}
                notLegit={notLegit}
                confirmLabel={confirmLabel}
                mode={mode}
                skipped={skipped}
                previous={previousStepId(step.id)}
                applicationStatus={applicationStatus}
                verdict={verdict}
                steps={steps}
                role={role}
                location={location}
                unverified={unverified}
                applicationGrade={applicationGrade}
              />
            </div>
          ) : (
            <article key={step.id} className="mt-4" data-review-step={step.id} data-step-index={step.index} hidden={step.id !== current.id}>
              <h3 className="font-serif text-xl font-normal">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink">{step.about}</p>
              <p className="mt-3 text-sm">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">Status</span>
                <span className="ml-2">{stepStatusLabel(step.status)}</span>
                {!step.saved ? <span className="ml-2">Auto-suggested</span> : null}
                {step.status === "SKIPPED" || step.status === "COULDNT_VERIFY" ? <span className="ml-2 text-[#7A2E2E]">Not a pass.</span> : null}
              </p>
              <ul className="mt-3 space-y-3">
                {step.findings.length === 0 ? <li className="text-sm text-mut">No automated result for this step.</li> : null}
                {step.findings.map((finding, index) => (
                  <li key={`${finding.source}-${index}`} className="rounded border border-line bg-cream p-3 text-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">{reviewCopy(finding.source)}</p>
                    <p className="mt-1 leading-relaxed text-ink">{displayedCheckFinding(reviewCopy(finding.text), { person, org })}</p>
                    {finding.url ? (
                      <a className="mt-1 inline-flex min-h-11 items-center text-forest underline" href={publicEvidenceHref(finding.url)} target="_blank" rel="noreferrer">
                        Open evidence
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
              {step.saved?.skipReason ? <p className="mt-3 text-sm text-ink">Skip reason: {step.saved.skipReason}</p> : null}
              <StepSaveForm action={saveReviewStep} className="mt-4 space-y-3">
                <input type="hidden" name="applicationId" value={applicationId} />
                <input type="hidden" name="caseId" value={caseId} />
                <input type="hidden" name="stepId" value={step.id} />
                <input type="hidden" name="intent" value="save" />
                <label className="block">
                  <span className={labelCls}>Your mark</span>
                  <select name="status" className={field} defaultValue={step.saved ? (step.status === "SKIPPED" ? "COULDNT_VERIFY" : step.status) : step.status}>
                    <option value="PASS">Pass</option>
                    <option value="CONCERN">Concern</option>
                    <option value="FAIL">Fail</option>
                    <option value="COULDNT_VERIFY">{"Couldn't verify"}</option>
                    <option value="NOT_CHECKED">Not checked</option>
                  </select>
                </label>
                <label className="block">
                  <span className={labelCls}>Evidence link</span>
                  <input name="evidenceUrl" className={field} defaultValue={publicEvidenceHref(shownRegistryCheck({ finding: step.saved?.note || step.prefill?.note || "", url: step.saved?.evidenceUrl || step.prefill?.evidenceUrl || "", location }).url)} placeholder="https://" />
                </label>
                <label className="block">
                  <span className={labelCls}>Note</span>
                  <textarea name="note" className={field} rows={6} defaultValue={displayedNote(step.saved?.note || step.prefill?.note || "", location, person, org)} placeholder="What was found, and what was not" />
                </label>
                <button className={`${btn} min-h-11 w-full sm:w-auto`} type="submit">
                  Save & next
                </button>
              </StepSaveForm>
              {step.index > 1 ? (
                <StepJumpForm applicationId={applicationId} caseId={caseId} stepId={previousStepId(step.id)} className="mt-2">
                  <button className={`${btnOutline} min-h-11 w-full sm:w-auto`} type="submit">
                    Back
                  </button>
                </StepJumpForm>
              ) : null}
              <div className="mt-3">
                <SkipStepForm applicationId={applicationId} caseId={caseId} stepId={step.id} />
              </div>
            </article>
          ),
        )}
      </ReviewStepFrame>
    </section>
  );
}

function displayedNote(note: string, location: string, person: string, org: string): string {
  return displayedCheckFinding(reviewCopy(shownRegistryCheck({ finding: note, url: "", location }).finding), { person, org });
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
  location,
  unverified,
  applicationGrade,
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
  location: string;
  unverified: string[];
  applicationGrade: { letter: string; score: number } | null;
}) {
  const strongWarning = needsStrongApprovalWarning({
    letter: grade?.letter,
    recommendation: grade?.recommendation,
    verdict,
  });
  const attention = (grade?.attention ?? []).map((item) => ({
    ...item,
    title: approvalAttentionTitle(item.title, location),
    detail: approvalAttentionDetail(item.title, item.detail, location),
  }));
  const displayGrade = grade ? { ...grade, attention } : null;
  const itemLists = approvalItemLists({ steps, attention });
  const warningText = grade
    ? strongApprovalWarning({
        letter: grade.letter,
        score: grade.score,
        verdict: approvalDialogVerdict(verdict, grade.recommendation),
        recommendation: grade.recommendation,
        failed: itemLists.failed,
        unverified: itemLists.unverified,
      })
    : "";
  const canRevoke = Boolean(applicationId) && (applicationStatus === "APPROVED" || applicationStatus === "PAYMENT_DUE");
  return (
    <div className="mt-4" id="decision-step">
      <h3 className="font-serif text-xl font-normal">Your decision</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink">
        {mode === "invite"
          ? "This person asked to join and has not submitted an application. Approve sends a referral code and marks this file Verified. Request more info marks it Needs info. Decline marks it Rejected."
          : "This is a recommendation for Richard Osika. He approves every member. Approve sends the membership-dues link when payment is required, and opens the floor right away otherwise. Decline sends a short notice. The applicant does not see the grade. The file status follows this decision."}
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
      {unverified.length ? (
        <div className="mt-3 rounded border border-[#7A2E2E] bg-cream p-3 text-sm" role="status">
          <p className="font-semibold text-[#7A2E2E]">Unverified</p>
          <ul className="mt-2 space-y-1">
            {unverified.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-2 text-ink">A company that exists is not the same as this applicant being connected to it.</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink">Nothing on the unverified list. A source corroborated this person.</p>
      )}
      {grade ? <p className="mt-3 text-sm text-ink">{gradeComparisonLine(grade, applicationGrade)}</p> : null}
      {displayGrade ? <ExecutiveSummary report={displayGrade} role={role} /> : <p className="mt-3 text-sm text-ink">Checking...</p>}
      {(mode === "application" && applicationId) || mode === "invite" ? (
        <DecisionForm
          applicationId={applicationId || ""}
          caseId={caseId}
          notLegit={notLegit}
          confirmLabel={confirmLabel}
          paying={paying}
          strongWarning={strongWarning}
          warningText={reviewCopy(warningText)}
          unverified={unverified}
          failed={itemLists.failed}
          variant={mode === "invite" ? "invite" : "application"}
        />
      ) : null}
      {mode === "closed" ? (
        <>
          <p className="mt-4 text-sm text-ink">This file already has a decision, or there is no open application to decide. The file status above follows that decision.</p>
          {canRevoke ? <RevokeApprovalForm applicationId={applicationId} caseId={caseId} /> : null}
        </>
      ) : null}
      <StepJumpForm applicationId={applicationId} caseId={caseId} stepId={previous} className="mt-3">
        <button className={`${btnOutline} min-h-11`} type="submit">
          Back
        </button>
      </StepJumpForm>
    </div>
  );
}
