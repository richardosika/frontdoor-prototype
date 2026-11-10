"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { btn, btnOutline } from "@/components/ui";

/**
 * Nov 10 (Julia): the X on an Opportunities card asks "Are you sure you want to remove this project?" before it hides
 * the project. A small dialog; works with a keyboard (Escape closes) and on a 390px phone.
 */
export function ConfirmDismiss({
  action,
  fields,
  label,
  question,
  yes,
  no,
}: {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
  question: string;
  yes: string;
  no: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
        className="grid h-11 w-11 place-items-center rounded-full text-[22px] leading-none text-mut hover:bg-cream hover:text-forest"
        data-testid="opportunity-dismiss"
      >
        ×
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-forest/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dismiss-q"
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          data-testid="confirm-dismiss"
        >
          <form action={action} className="w-full max-w-sm rounded border border-brass bg-paper p-5 text-left shadow-lg">
            {Object.entries(fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <p id="confirm-dismiss-q" className="font-serif text-[20px] leading-snug text-forest">{question}</p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" className={btnOutline} onClick={() => setOpen(false)} autoFocus data-testid="confirm-dismiss-no">
                {no}
              </button>
              <SubmitButton className={btn} data-testid="confirm-dismiss-yes" pendingLabel="Removing…">
                {yes}
              </SubmitButton>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
