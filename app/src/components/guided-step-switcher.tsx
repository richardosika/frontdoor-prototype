"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { saveReviewStep } from "@/actions/review";
import { clearStepSave, markStepSave } from "@/lib/decision-queue";

/**
 * Every review step is in the first HTML. A tab click shows that step immediately.
 * The save no longer navigates away, so Approve stays on the page through the save.
 */
export function ReviewStepFrame({ currentId, children }: { currentId: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const picked = useRef<string | null>(null);
  const [active, setActive] = useState(currentId);

  useEffect(() => {
    const onStep = (event: Event) => {
      const id = event instanceof CustomEvent ? event.detail : "";
      if (typeof id !== "string" || !id) return;
      picked.current = id;
      setActive(id);
    };
    window.addEventListener("pf-review-step", onStep);
    return () => window.removeEventListener("pf-review-step", onStep);
  }, []);

  useEffect(() => {
    if (picked.current && picked.current !== currentId) return;
    picked.current = null;
    setActive(currentId);
  }, [currentId]);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    for (const panel of root.querySelectorAll<HTMLElement>("[data-review-step]")) {
      panel.hidden = panel.getAttribute("data-review-step") !== active;
    }
    for (const tab of root.querySelectorAll<HTMLElement>("[data-review-tab]")) {
      const on = tab.getAttribute("data-review-tab") === active;
      tab.setAttribute("aria-current", on ? "step" : "false");
      tab.classList.toggle("border-brass", on);
      tab.classList.toggle("bg-forest", on);
      tab.classList.toggle("text-paper", on);
      tab.classList.toggle("border-line", !on);
      tab.classList.toggle("bg-cream", !on);
      tab.classList.toggle("text-ink", !on);
    }
    const panel = root.querySelector<HTMLElement>(`[data-review-step="${CSS.escape(active)}"]`);
    const heading = root.querySelector<HTMLElement>("[data-review-heading]");
    const total = heading?.getAttribute("data-total") || "";
    const index = panel?.getAttribute("data-step-index") || "";
    if (heading && index && total) heading.textContent = `Step ${index} of ${total}`;
  });

  return <div ref={ref}>{children}</div>;
}

/** Jump to a step without a full page change. The address updates before the save so a refresh keeps this step. */
export function StepJumpForm({
  applicationId,
  caseId,
  stepId,
  className,
  children,
}: {
  applicationId: string;
  caseId: string;
  stepId: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form
      className={className}
      data-step-save="1"
      action={async (formData) => {
        await saveReviewStep(formData);
        clearStepSave();
      }}
      onSubmit={() => {
        const url = new URL(window.location.href);
        url.searchParams.set("step", stepId);
        url.searchParams.delete("notice");
        url.searchParams.delete("error");
        window.history.replaceState(window.history.state, "", `${url.pathname}?${url.searchParams.toString()}`);
        markStepSave();
        for (const panel of document.querySelectorAll<HTMLElement>("[data-review-step]")) {
          panel.hidden = panel.getAttribute("data-review-step") !== stepId;
        }
        window.dispatchEvent(new CustomEvent("pf-review-step", { detail: stepId }));
      }}
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="stepId" value={stepId} />
      <input type="hidden" name="intent" value="jump" />
      {children}
    </form>
  );
}
