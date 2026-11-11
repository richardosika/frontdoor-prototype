"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { btn } from "@/components/ui";

/** Nov 10 (Julia): after a sub submits or updates a bid, a pop-up says "Thanks for submitting." */
export function ThanksPopup({ text, ok }: { text: string; ok: string }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  if (!open) return null;
  const close = () => {
    setOpen(false);
    router.replace(pathname, { scroll: false });
  };
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-forest/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="thanks-popup-text"
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
      data-testid="bid-thanks"
    >
      <div className="w-full max-w-sm rounded border border-brass bg-paper p-5 text-center shadow-lg">
        <p id="thanks-popup-text" className="font-serif text-[22px] leading-snug text-forest">{text}</p>
        <button type="button" className={`${btn} mt-4`} onClick={close} autoFocus data-testid="bid-thanks-ok">
          {ok}
        </button>
      </div>
    </div>
  );
}
