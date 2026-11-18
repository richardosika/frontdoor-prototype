import { SubmitButton } from "@/components/submit-button";
import { introduceTwoMembers } from "@/actions/member-introductions";
import { btn, card, field, labelCls } from "@/components/ui";
import { serverTx } from "@/lib/i18n/server";

/** Introduce two people from My Circle to each other. Both get a message thread and a notification. */
export async function IntroduceMembers({ people }: { people: { id: string; name: string; org: string }[] }) {
  const tx = await serverTx();
  if (people.length < 2) return null;
  const options = people.map((p) => (
    <option key={p.id} value={p.id}>
      {p.name}{p.org ? ` · ${p.org}` : ""}
    </option>
  ));
  return (
    <section id="introduce" className={`${card} mt-4 scroll-mt-20 p-4`} data-testid="introduce-members">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Introduce two members")}</h2>
      <p className="mt-1 text-[14px] text-mut">{tx("Both members get a message thread with each other and a notification.")}</p>
      <form action={introduceTwoMembers} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>{tx("First member")}</span>
          <select name="memberA" className={field} required defaultValue="">
            <option value="" disabled>{tx("Choose a member")}</option>
            {options}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>{tx("Second member")}</span>
          <select name="memberB" className={field} required defaultValue="">
            <option value="" disabled>{tx("Choose a member")}</option>
            {options}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className={labelCls}>{tx("Why they should talk")}</span>
          <textarea name="note" className={`${field} h-20 resize-none`} maxLength={800} required />
        </label>
        <SubmitButton className={`${btn} sm:col-span-2 sm:justify-self-start`} data-testid="introduce-submit">{tx("Send introduction")}</SubmitButton>
      </form>
    </section>
  );
}
