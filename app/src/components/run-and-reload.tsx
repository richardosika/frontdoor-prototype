"use client";

import { useState, type ReactNode } from "react";

export function ConfirmSubmitButton({
  form,
  message,
  className,
  children,
}: {
  form: string;
  message: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <button
      form={form}
      className={className}
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
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
  return (
    <div>
      {error ? <p className="mb-2 text-sm text-brass">{error}</p> : null}
      <button
        className={className}
        type="button"
        disabled={pending}
        onClick={async () => {
          if (confirmMessage && !window.confirm(confirmMessage)) return;
          setPending(true);
          setError("");
          try {
            const result = await run();
            window.location.assign(result.href);
          } catch {
            setError("That action did not finish. Reload the page and try again.");
            setPending(false);
          }
        }}
      >
        {pending ? pendingLabel : label}
      </button>
    </div>
  );
}
