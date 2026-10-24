"use client";

import { useState } from "react";
import { btn } from "@/components/ui";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-2 rounded border border-brass bg-brass-soft p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">Portal link</p>
      <p className="mt-1 text-xs leading-relaxed text-ink">
        Your counterparty opens this page to confirm. Private Floor does not email the link or any contact details. Their reply does not change your tier. A Private Floor administrator reviews the vouch first.
      </p>
      <div className="mt-2 flex gap-2">
        <input readOnly value={url} className="min-h-11 min-w-0 flex-1 rounded-sm border border-line bg-paper px-2 text-xs text-forest" />
        <button
          type="button"
          className={btn}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
