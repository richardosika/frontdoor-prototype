"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useTx } from "@/components/locale-context";

/** Start review: answers the tap at once while the case is prepared. */
export function StartReviewButton({ className = "" }: { className?: string }) {
  const tx = useTx();
  const { pending } = useFormStatus();
  return (
    <button
      className={`${className} ${pending ? "cursor-wait opacity-80" : ""}`}
      type="submit"
      disabled={pending}
      aria-busy={pending}
      aria-live="polite"
      data-review-pending={pending ? "true" : undefined}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" />
          {tx("Preparing review…")}
        </span>
      ) : (
        tx("Start review")
      )}
    </button>
  );
}

/** The record card that also starts the review. Dims while the review opens. */
export function StartReviewCard({ className = "", children }: { className?: string; children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className={`${className} ${pending ? "cursor-wait opacity-60" : ""}`} type="submit" disabled={pending} aria-busy={pending}>
      {children}
    </button>
  );
}
