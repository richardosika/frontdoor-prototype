"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTx } from "@/components/locale-context";
import { btn } from "@/components/ui";

/** Nov 5: a pop-up so the member knows the report reached a Private Floor administrator. */
export function ReportSentPopup() {
  const tx = useTx();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (params.get("reported") === "1") setOpen(true);
  }, [params]);
  if (!open) return null;
  const close = () => {
    setOpen(false);
    router.replace(pathname, { scroll: false });
  };
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-forest/50 px-4" role="dialog" aria-modal="true" aria-labelledby="report-sent-title" data-testid="report-sent">
      <div className="w-full max-w-sm rounded border border-brass bg-paper p-5 text-forest shadow-xl">
        <p className="text-[28px] leading-none" aria-hidden>✓</p>
        <h2 id="report-sent-title" className="mt-2 font-serif text-[24px] leading-tight">{tx("Report sent")}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink">{tx("A Private Floor administrator will review it. Thank you for telling us.")}</p>
        <button type="button" className={`${btn} mt-4 w-full`} onClick={close} autoFocus data-testid="report-sent-ok">
          {tx("OK")}
        </button>
      </div>
    </div>
  );
}
