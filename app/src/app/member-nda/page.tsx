import { acceptMemberNda } from "@/actions/member-nda";
import { Logo } from "@/components/logo";
import { btn } from "@/components/ui";
import { requireUser } from "@/lib/current-user";
import { currentLocale, serverTx } from "@/lib/i18n/server";
import { documentVersion, memberFacingLegal, readLegalMarkdown } from "@/lib/legal";
import { renderMarkdown } from "@/lib/markdown";
import { MEMBER_NDA_LABEL, safeNext } from "@/lib/member-nda";

export const dynamic = "force-dynamic";

export default async function MemberNdaGate({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  await requireUser();
  const params = await searchParams;
  const [locale, tx] = await Promise.all([currentLocale(), serverTx()]);
  const source = readLegalMarkdown("member-nda.md", locale);
  const version = documentVersion(readLegalMarkdown("member-nda.md"));
  const html = renderMarkdown(memberFacingLegal(source));
  return (
    <main className="min-h-dvh bg-cream md:wash md:px-4 md:py-10" data-testid="member-nda-gate">
      <article className="mx-auto min-h-dvh w-full max-w-2xl bg-paper px-6 py-8 text-forest md:min-h-0 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <Logo />
        <h1 className="mt-6 font-serif text-[30px] leading-tight">{tx("Before you continue: the Member NDA")}</h1>
        <p className="mt-2 text-[16px] text-ink">{tx("Every member now agrees to one confidentiality agreement that covers deal information, documents, deal rooms, messages, and member details. Please read it and agree to continue.")}</p>
        <p className="mt-3 rounded border border-brass bg-brass-soft px-3 py-2 text-sm">
          {tx("Draft - pending attorney review.")} {tx("Version")} {version}.
        </p>
        <div className="mt-4 max-h-[55vh] overflow-y-auto rounded border border-line bg-cream/40 px-4 py-2 text-[15px]" dangerouslySetInnerHTML={{ __html: html }} />
        <form action={acceptMemberNda} className="mt-5 grid gap-3">
          <input type="hidden" name="next" value={safeNext(params.next)} />
          <label className={`flex items-start gap-3 rounded-sm border p-3 text-[15px] ${params.error ? "border-[#9b2c22] bg-[#9b2c22]/5" : "border-brass/60 bg-paper"}`}>
            <input type="checkbox" name="agree" required className="mt-1 h-5 w-5 shrink-0" />
            <span>{tx(MEMBER_NDA_LABEL)}</span>
          </label>
          {params.error ? <p role="alert" className="text-sm font-semibold text-[#9b2c22]">{tx("Check the box to agree to the Member NDA.")}</p> : null}
          <button className={btn} type="submit">
            {tx("Agree and continue")}
          </button>
        </form>
      </article>
    </main>
  );
}
