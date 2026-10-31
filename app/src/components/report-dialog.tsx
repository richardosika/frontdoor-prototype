"use client";
import { useTx } from "@/components/locale-context";

import { useState } from "react";
import { reportMember } from "@/actions/social";
import { btn, btnOutline, field } from "@/components/ui";

export function ReportDialog({
  userId,
  conversationId,
  label,
}: {
  userId: string;
  conversationId?: string;
  label: string;
}) {
  const tx = useTx();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button className={btnOutline} type="button" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }
  return (
    <form action={reportMember} className="grid gap-2 rounded border border-line bg-cream p-3">
      <input type="hidden" name="userId" value={userId} />
      {conversationId ? <input type="hidden" name="conversationId" value={conversationId} /> : null}
      <p className="text-sm font-semibold">{tx("Report to a Private Floor administrator")}</p>
      <textarea name="reason" className={field} rows={3} placeholder={tx("What should the administrator know?")} required />
      <div className="flex gap-2">
        <button className={btnOutline} type="button" onClick={() => setOpen(false)}>
          {tx("Cancel")}
        </button>
        <button className={btn} type="submit">
          {tx("Send report")}
        </button>
      </div>
    </form>
  );
}
