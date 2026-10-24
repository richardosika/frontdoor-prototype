"use client";

import { useState } from "react";
import { btnOutline } from "@/components/ui";

export function CopyCode({ code, caption }: { code: string; caption: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded border border-brass bg-brass-soft p-3 text-sm">
      <p className="text-ink">{caption}</p>
      <p className="mt-2 font-mono text-base text-forest">{code}</p>
      <button
        className={`${btnOutline} mt-3`}
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
