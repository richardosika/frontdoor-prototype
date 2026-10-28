"use client";

import { useState } from "react";
import { reportMember } from "@/actions/social";
import { btn, btnOutline, field } from "@/components/ui";
import { REPORT_CATEGORIES, REPORT_CATEGORY_LABELS } from "@/lib/platform/messaging-policy";

export function ReportDialog({
  userId,
  conversationId,
  messageId,
  label,
}: {
  userId: string;
  conversationId?: string;
  messageId?: string;
  label: string;
}) {
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
      {messageId ? <input type="hidden" name="messageId" value={messageId} /> : null}
      <p className="text-sm font-semibold">Report to a Private Floor administrator</p>
      <label className="text-sm">
        Reason category
        <select name="category" className={field} defaultValue="OTHER">
          {REPORT_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {REPORT_CATEGORY_LABELS[item]}
            </option>
          ))}
        </select>
      </label>
      <textarea name="reason" className={field} rows={3} placeholder="What should the administrator know?" required />
      <div className="flex gap-2">
        <button className={btnOutline} type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button className={btn} type="submit">
          Send report
        </button>
      </div>
    </form>
  );
}
