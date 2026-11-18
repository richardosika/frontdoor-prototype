"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTx } from "@/components/locale-context";
import { btn } from "@/components/ui";

/**
 * Nov 6: one confirmation pop-up for Block, Unblock, Report and Remove from My Circle, mounted once in the member
 * layout so it shows on every screen (the ⋯ menu that holds the buttons closes after the action, so a pop-up inside
 * it was never seen). The action redirects back with ?done=blocked|unblocked|reported|removed.
 */
const DONE: Record<string, { title: string; body: string }> = {
  blocked: { title: "Member blocked", body: "They can no longer message you or see your projects. They are not told. Your reason went to a Private Floor administrator." },
  unblocked: { title: "Member unblocked", body: "They can see your projects again and messaging follows the usual rules." },
  reported: { title: "Report sent", body: "A Private Floor administrator will review it. Thank you for telling us." },
  removed: { title: "Removed from My Circle", body: "They were not blocked or told. You can still block them from their profile." },
};

export function ActionDonePopup() {
  const tx = useTx();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [kind, setKind] = useState("");
  useEffect(() => {
    const done = params.get("done") || (params.get("reported") === "1" ? "reported" : "");
    if (DONE[done]) setKind(done);
  }, [params]);
  if (!kind) return null;
  const copy = DONE[kind];
  const close = () => {
    setKind("");
    router.replace(pathname, { scroll: false });
  };
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-forest/50 px-4" role="dialog" aria-modal="true" aria-labelledby="action-done-title" data-testid="action-done" data-kind={kind} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="w-full max-w-sm rounded border border-brass bg-paper p-5 text-forest shadow-xl" data-testid={kind === "reported" ? "report-sent" : undefined}>
        <p className="text-[28px] leading-none" aria-hidden>✓</p>
        <h2 id="action-done-title" className="mt-2 font-serif text-[24px] leading-tight">{tx(copy.title)}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink">{tx(copy.body)}</p>
        <button type="button" className={`${btn} mt-4 w-full`} onClick={close} autoFocus data-testid="action-done-ok">
          {tx("OK")}
        </button>
      </div>
    </div>
  );
}

/** Kept for older imports; the pop-up now lives in the member layout. */
export function ReportSentPopup() {
  return null;
}
