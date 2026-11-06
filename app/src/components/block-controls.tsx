"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { useTx } from "@/components/locale-context";
import { blockMember, unblockMember } from "@/actions/social";
import { btn, btnOutline, field } from "@/components/ui";

/** Nov 5: blocking asks for a reason (sent to the Private Floor administrators); you stay on the same screen. */
export function BlockButton({ userId, conversationId, className = btnOutline }: { userId: string; conversationId?: string; className?: string }) {
  const tx = useTx();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className={className} onClick={() => setOpen(true)} data-testid="block-open">
        {tx("Block")}
      </button>
    );
  }
  return (
    <form action={blockMember} className="grid w-full min-w-[16rem] gap-2 rounded border border-line bg-cream p-3 text-left" data-testid="block-form">
      <input type="hidden" name="userId" value={userId} />
      {conversationId ? <input type="hidden" name="conversationId" value={conversationId} /> : null}
      <input type="hidden" name="back" value={pathname} />
      <p className="text-sm font-semibold text-forest">{tx("Why are you blocking this member?")}</p>
      <textarea name="reason" className={field} rows={3} minLength={3} maxLength={500} required placeholder={tx("A short reason. Only Private Floor administrators see it.")} />
      <p className="text-[13px] text-mut">{tx("They will not be able to message you or see your projects. They are not told.")}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnOutline} onClick={() => setOpen(false)}>
          {tx("Cancel")}
        </button>
        <SubmitButton className={btn} pendingLabel="Blocking…" data-testid="block-submit">
          {tx("Block member")}
        </SubmitButton>
      </div>
    </form>
  );
}

export function UnblockButton({ userId, conversationId, className = btnOutline }: { userId: string; conversationId?: string; className?: string }) {
  const tx = useTx();
  const pathname = usePathname();
  return (
    <form action={unblockMember}>
      <input type="hidden" name="userId" value={userId} />
      {conversationId ? <input type="hidden" name="conversationId" value={conversationId} /> : null}
      <input type="hidden" name="back" value={pathname} />
      <SubmitButton className={className} pendingLabel="Unblocking…" data-testid="unblock-submit">
        {tx("Unblock")}
      </SubmitButton>
    </form>
  );
}
