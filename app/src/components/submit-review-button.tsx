"use client";

import { useFormStatus } from "react-dom";
import { useTx } from "@/components/locale-context";
import { btn } from "@/components/ui";

/** Shows "Submitted" the moment the member taps, while the upload and save finish. */
export function SubmitReviewButton({ label, className = "" }: { label: string; className?: string }) {
  const tx = useTx();
  const { pending } = useFormStatus();
  return (
    <button className={`${btn} ${className}`} type="submit" disabled={pending} aria-live="polite" data-testid="submit-for-review">
      {pending ? `✓ ${tx("Submitted")}. ${tx("Sending to review…")}` : label}
    </button>
  );
}
