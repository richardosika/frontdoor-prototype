"use client";

import { useState, type ReactNode } from "react";
import { btn, btnOutline } from "@/components/ui";

export const CANCELLED_RESULT = "Cancelled. Nothing was changed.";

function ConfirmModal({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  cancelLabel = "Cancel",
}: {
  cancelLabel?: string;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-forest/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-confirm-title"
        className="w-full max-w-md rounded border border-line bg-paper p-4 shadow-[0_30px_80px_rgba(0,0,0,.28)]"
      >
        <h2 id="action-confirm-title" className="font-serif text-2xl font-normal text-forest">
          {title}
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{body}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button className={`${btn} min-h-12 w-full sm:w-auto`} type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className={`${btnOutline} min-h-12 w-full sm:w-auto`} type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmSubmitButton({
  form,
  message,
  className,
  children,
  keepLabel,
  cancelledText,
}: {
  keepLabel?: string;
  cancelledText?: string;
  form: string;
  message: string;
  className: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState("");
  const label = typeof children === "string" ? children : "Confirm";
  return (
    <div>
      {result ? (
        <p className="mb-2 text-sm text-forest" role="status">
          {result}
        </p>
      ) : null}
      <button
        form={form}
        className={className}
        type="button"
        onClick={() => {
          setResult("");
          setOpen(true);
        }}
      >
        {children}
      </button>
      {open ? (
        <ConfirmModal
          title={label}
          body={message}
          confirmLabel={label}
          cancelLabel={keepLabel}
          onConfirm={() => {
            setOpen(false);
            const target = document.getElementById(form);
            if (target instanceof HTMLFormElement) target.requestSubmit();
          }}
          onCancel={() => {
            setOpen(false);
            setResult(cancelledText ?? CANCELLED_RESULT);
          }}
        />
      ) : null}
    </div>
  );
}

export function RunAndReload({
  label,
  pendingLabel,
  className,
  confirmMessage,
  run,
}: {
  label: string;
  pendingLabel: string;
  className: string;
  confirmMessage?: string;
  run: () => Promise<{ href: string }>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [open, setOpen] = useState(false);

  async function start() {
    setPending(true);
    setError("");
    setResult("");
    try {
      const next = await run();
      window.location.assign(next.href);
    } catch {
      setError("That action did not finish. Reload the page and try again.");
      setPending(false);
    }
  }

  return (
    <div>
      {error ? <p className="mb-2 text-sm text-brass">{error}</p> : null}
      {result ? (
        <p className="mb-2 text-sm text-forest" role="status">
          {result}
        </p>
      ) : null}
      <button
        className={className}
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirmMessage) {
            void start();
            return;
          }
          setResult("");
          setOpen(true);
        }}
      >
        {pending ? pendingLabel : label}
      </button>
      {open && confirmMessage ? (
        <ConfirmModal
          title={label}
          body={confirmMessage}
          confirmLabel={label}
          onConfirm={() => {
            setOpen(false);
            void start();
          }}
          onCancel={() => {
            setOpen(false);
            setResult(CANCELLED_RESULT);
          }}
        />
      ) : null}
    </div>
  );
}
