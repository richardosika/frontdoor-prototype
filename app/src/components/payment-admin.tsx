import {
  markPaidManually,
  recordRefund,
  resendPaymentLink,
  sendFailedPaymentNotice,
  sendRenewalReminderAction,
  waiveDues,
} from "@/actions/payments";
import { btn, btnOutline, card, field, labelCls } from "@/components/ui";
import { currentMonthlyCents, offerLabel } from "@/lib/dues";
import { formatAuditTime, formatLongEtDate } from "@/lib/format";
import { paymentRequired, paymentStatusLabel } from "@/lib/payments";

export function PaymentPanel({
  userId,
  role,
  status,
  duesCents,
  renewalAt,
  paidAt,
  paymentMode,
  waiverReason,
  refundNote,
  back,
}: {
  userId: string;
  role: string;
  status: string;
  duesCents: number;
  renewalAt: Date | null;
  paidAt: Date | null;
  paymentMode: string;
  waiverReason: string;
  refundNote: string;
  back: string;
}) {
  if (!paymentRequired(role) && status === "NOT_REQUIRED") {
    return (
      <section className={`${card} mt-4 p-4 text-sm`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Dues</h2>
        <p className="mt-2 text-ink">No monthly dues. This role activates as soon as you approve it.</p>
      </section>
    );
  }

  return (
    <section className={`${card} mt-4 p-4 text-sm`}>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Dues</h2>
      <p className="mt-2">
        <b>Payment status:</b> {paymentStatusLabel(status)} · {offerLabel(currentMonthlyCents(role, duesCents))}
      </p>
      <p className="mt-1">
        <b>Renewal date:</b> {renewalAt ? formatLongEtDate(renewalAt) : "Not set"}
        {paidAt ? ` · paid ${formatAuditTime(paidAt)}` : ""}
        {paymentMode ? ` · ${paymentMode}` : ""}
      </p>
      {waiverReason ? <p className="mt-1">Waiver: {waiverReason}</p> : null}
      {refundNote ? <p className="mt-1">Refund note: {refundNote}</p> : null}
      <p className="mt-1 text-xs text-mut">No card number is stored.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <form action={resendPaymentLink}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="back" value={back} />
          <button className={btnOutline} type="submit">
            Resend payment link
          </button>
        </form>
        <form action={markPaidManually}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="back" value={back} />
          <button className={btn} type="submit">
            Mark paid
          </button>
        </form>
        <form action={sendRenewalReminderAction}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="back" value={back} />
          <button className={btnOutline} type="submit">
            Send full-price reminder
          </button>
        </form>
        <form action={sendFailedPaymentNotice}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="back" value={back} />
          <button className={btnOutline} type="submit">
            Send failed-payment notice
          </button>
        </form>
      </div>
      <form action={waiveDues} className="mt-3 grid gap-2">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="back" value={back} />
        <label>
          <span className={labelCls}>Waive or comp dues</span>
          <input name="reason" className={field} placeholder="Reason, required" required minLength={3} />
        </label>
        <button className={btnOutline} type="submit">
          Waive dues
        </button>
      </form>
      <form action={recordRefund} className="mt-3 grid gap-2">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="back" value={back} />
        <label>
          <span className={labelCls}>Refund note</span>
          <input name="note" className={field} placeholder="What was refunded, required" required minLength={3} />
        </label>
        <button className={btnOutline} type="submit">
          Save refund note
        </button>
      </form>
    </section>
  );
}
