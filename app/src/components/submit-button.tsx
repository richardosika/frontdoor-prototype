"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useTx } from "@/components/locale-context";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  children: ReactNode;
  /** English phrase shown while the form is sending; translated with tx. */
  pendingLabel?: string;
};

/**
 * Submit button that answers the tap at once: spinner, pending label, and disabled while the
 * form's server action runs, so a slow action cannot be sent twice. In forms with several
 * submit buttons (name/value), only the tapped one shows the spinner; all are disabled.
 */
export function SubmitButton({ children, pendingLabel = "Working…", className = "", disabled, name, value, ...rest }: Props) {
  const tx = useTx();
  const { pending, data } = useFormStatus();
  const mine = pending && (!name || value === undefined || !data || data.get(name) === String(value));
  return (
    <button
      {...rest}
      name={name}
      value={value}
      type="submit"
      className={`${className} ${pending ? "cursor-wait" : ""} ${mine ? "opacity-80" : ""}`}
      disabled={disabled || pending}
      aria-busy={mine || undefined}
      aria-live="polite"
      data-pending={mine ? "true" : undefined}
    >
      {mine ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span aria-hidden className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent" />
          {tx(pendingLabel)}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
