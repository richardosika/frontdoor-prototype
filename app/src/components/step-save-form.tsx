"use client";

import { useEffect, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { markStepSave } from "@/lib/decision-queue";

function StepSaveWatcher() {
  const { pending } = useFormStatus();
  useEffect(() => {
    if (pending) markStepSave();
  }, [pending]);
  return null;
}

/** A review-step form. While its save is in flight, the decision dialog keeps the Approve click. */
export function StepSaveForm({
  action,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      className={className}
      data-step-save="1"
      onSubmit={() => {
        markStepSave();
      }}
    >
      <StepSaveWatcher />
      {children}
    </form>
  );
}
