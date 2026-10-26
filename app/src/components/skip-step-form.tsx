"use client";

import { useState } from "react";
import { saveReviewStep } from "@/actions/review";
import { btn, btnOutline, field, labelCls } from "@/components/ui";

export function SkipStepForm({ applicationId, caseId, stepId }: { applicationId: string; caseId: string; stepId: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button className={`${btnOutline} min-h-11`} type="button" onClick={() => setOpen(true)}>
        Skip (override)
      </button>
    );
  }
  return (
    <form action={saveReviewStep} className="rounded border border-[#7A2E2E] bg-cream p-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="stepId" value={stepId} />
      <input type="hidden" name="intent" value="skip" />
      <p className="font-serif text-xl text-forest">Skip this step</p>
      <p className="mt-1 text-sm text-ink">A skip is not a pass. It is written to the audit log and it lowers confidence. It does not raise the grade.</p>
      <label className="mt-3 block">
        <span className={labelCls}>Reason</span>
        <textarea name="skipReason" className={field} rows={3} required minLength={8} placeholder="Why you are skipping this" />
      </label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button className={`${btn} min-h-11`} type="submit">
          Record skip
        </button>
        <button className={`${btnOutline} min-h-11`} type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
