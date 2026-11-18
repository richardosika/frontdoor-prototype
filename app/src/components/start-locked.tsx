import Link from "next/link";
import { serverTx } from "@/lib/i18n/server";

/** Nov 5: shown instead of opportunities and connections until Getting started is done. */
export async function StartLocked() {
  const tx = await serverTx();
  return (
    <section className="mt-4 rounded border border-forest bg-forest p-4 text-paper md:p-5" data-testid="start-locked">
      <h2 className="font-serif text-[22px] leading-snug md:text-[26px]">{tx("Finish Getting started to open your Ledger")}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-sand md:text-[16px]">{tx("Opportunities, your circle and who viewed your profile stay hidden until each Getting started step above is done. This keeps every member on Private Floor fully reviewed and complete.")}</p>
      <Link href="/feed" className="mt-3 inline-flex min-h-11 items-center font-semibold text-paper underline decoration-brass">{tx("Go to Getting started")} ›</Link>
    </section>
  );
}
