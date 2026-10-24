import Link from "next/link";
import { changePassword, requestAccountDeletion, saveNotificationPrefs } from "@/actions/profile";
import { Banner } from "@/components/banner";
import { PageHeader } from "@/components/page-header";
import { btn, btnOutline, card, field, labelCls } from "@/components/ui";
import { requireUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  return (
    <div className="mx-auto max-w-3xl px-4 pb-6 pt-3 md:pt-6 lg:px-8">
      <PageHeader title="Settings" />
      <div className="mt-3">
        <Banner error={params.error} notice={params.notice} />
      </div>
      <section className={`${card} mt-4 p-4`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Notifications</h2>
        <p className="mt-1 text-sm text-ink">The bell always records an alert. Email copies go only to the test recipient, and only when the box is on.</p>
        <form action={saveNotificationPrefs} className="mt-3 space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="notifyMessages" defaultChecked={user.notifyMessages} />
            Messages
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="notifyIntros" defaultChecked={user.notifyIntros} />
            Introductions
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="notifyDeals" defaultChecked={user.notifyDeals} />
            Deals and deal rooms
          </label>
          <button className={btn} type="submit">
            Save notification settings
          </button>
        </form>
      </section>
      <section className={`${card} mt-4 p-4`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Password</h2>
        <form action={changePassword} className="mt-3 grid gap-2">
          <label>
            <span className={labelCls}>Current password</span>
            <input name="current" type="password" className={field} required autoComplete="current-password" />
          </label>
          <label>
            <span className={labelCls}>New password</span>
            <input name="next" type="password" className={field} required minLength={8} maxLength={72} autoComplete="new-password" />
          </label>
          <button className={btn} type="submit">
            Change password
          </button>
        </form>
      </section>
      <section className={`${card} mt-4 p-4 text-sm`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Your data</h2>
        <p className="mt-2 text-ink">The export is your profile, posts, and messages you sent. It does not include another member’s email or phone.</p>
        <Link href="/api/me/export" className={`${btnOutline} mt-3`}>
          Export my data
        </Link>
      </section>
      <section className={`${card} mt-4 p-4`}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Delete this account</h2>
        <p className="mt-2 text-sm text-ink">
          {user.deletionRequestedAt
            ? "A Private Floor administrator already has this request."
            : "This asks a Private Floor administrator to remove the account. It does not delete it immediately."}
        </p>
        <form action={requestAccountDeletion} className="mt-3 grid gap-2">
          <textarea name="note" className={field} rows={2} placeholder="Optional note" />
          <button className={btnOutline} type="submit">
            Request account deletion
          </button>
        </form>
      </section>
    </div>
  );
}
