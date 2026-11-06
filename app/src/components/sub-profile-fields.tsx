import { currentLocale } from "@/lib/i18n/server";
import { phrase } from "@/lib/i18n/phrases";
import { US_STATES } from "@/lib/member-network";
import { prisma } from "@/lib/prisma";
import { parseTrades, sortedTrades } from "@/lib/trades";

const labelCls = "mb-2 block font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-forest";
const field =
  "w-full min-h-12 rounded-sm border border-line bg-paper px-3.5 py-3 font-sans text-[17px] text-forest outline-none placeholder:text-mut/70 focus:border-brass";
const box = "h-5 w-5 shrink-0 accent-[#1F3A2E]";

/**
 * Nov 6 Subcontractors: trades, metros, union / prevailing wage, contractor license, certificate of insurance and
 * bonding capacity, inside the profile editor form. States served use the profile's state checkboxes (markets).
 */
export async function SubProfileFields({ userId }: { userId: string }) {
  const locale = await currentLocale();
  const tx = (s: string) => phrase(locale, s);
  const [u, coi] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { trades: true, metros: true, unionShop: true, prevailingWage: true, licenseNumber: true, licenseState: true, bondingCapacity: true } }),
    prisma.insuranceCertificate.findUnique({ where: { userId }, select: { fileName: true, uploadedAt: true } }),
  ]);
  if (!u) return null;
  const picked = new Set(parseTrades(u.trades));
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "America/New_York" });
  const YesNo = ({ name, value, label }: { name: string; value: string; label: string }) => (
    <fieldset className="min-w-0">
      <legend className={labelCls}>{tx(label)}</legend>
      <div className="flex flex-wrap gap-2">
        {[["yes", "Yes"], ["no", "No"]].map(([v, l]) => (
          <label key={v} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-paper px-4 text-[16px] has-[:checked]:border-brass has-[:checked]:bg-cream">
            <input type="radio" name={name} value={v} defaultChecked={value === v} className={box} data-testid={`${name}-${v}`} />
            {tx(l)}
          </label>
        ))}
      </div>
    </fieldset>
  );
  return (
    <section className="grid min-w-0 gap-5 rounded border border-brass/60 bg-paper p-4 sm:p-5" data-testid="sub-profile">
      <input type="hidden" name="subFieldsShown" value="1" />
      <div>
        <h3 className="font-serif text-[22px] text-forest">{tx("Subcontractor details")}</h3>
        <p className="mt-1 font-sans text-[14px] text-mut">{tx("General contractors see your trades and service area. Trade bid packages reach you only for trades you pick, in states you serve (the states ticked above).")}</p>
      </div>
      <fieldset className="min-w-0" data-testid="sub-trades">
        <legend className={labelCls}>{tx("Trades")} *</legend>
        <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTrades(locale, tx).map((t) => (
            <label key={t.id} className="flex min-h-11 cursor-pointer items-center gap-3 font-sans text-[16px] text-ink">
              <input type="checkbox" name="trades" value={t.id} defaultChecked={picked.has(t.id)} className={box} data-testid={`trade-${t.id}`} />
              {tx(t.label)}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        <span className={labelCls}>{tx("Metro areas served")}</span>
        <input name="metros" defaultValue={u.metros} maxLength={300} className={field} placeholder={tx("e.g. Newark, Jersey City, New York City")} data-testid="sub-metros" />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <YesNo name="unionShop" value={u.unionShop} label="Union shop" />
        <YesNo name="prevailingWage" value={u.prevailingWage} label="Prevailing-wage work" />
      </div>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <label>
          <span className={labelCls}>{tx("Contractor license number")} *</span>
          <input name="licenseNumber" defaultValue={u.licenseNumber} maxLength={80} className={field} data-testid="sub-license-number" />
        </label>
        <label>
          <span className={labelCls}>{tx("License state")} *</span>
          <select name="licenseState" defaultValue={u.licenseState} className={field} data-testid="sub-license-state">
            <option value="">—</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <label data-testid="sub-coi">
        <span className={labelCls}>{tx("Certificate of insurance")} *</span>
        {coi ? (
          <span className="mb-2 block font-sans text-[15px] text-forest" data-testid="sub-coi-on-file">
            ✓ {tx("On file")}: <a href="/api/insurance-certificates/me" target="_blank" rel="noreferrer" className="underline decoration-brass [overflow-wrap:anywhere]">{coi.fileName}</a> · {date.format(coi.uploadedAt)}
          </span>
        ) : null}
        <input name="coi" type="file" accept="application/pdf,image/jpeg,image/png" className="block w-full text-[15px] file:mr-3 file:min-h-11 file:rounded-sm file:border file:border-forest file:bg-paper file:px-4 file:font-semibold file:text-forest" data-testid="sub-coi-input" />
        <span className="mt-1 block font-sans text-[14px] text-mut">{tx("PDF, JPG or PNG up to 10 MB. Only you and Private Floor staff can open it; members see that it is on file.")}</span>
      </label>
      <label>
        <span className={labelCls}>{tx("Bonding capacity (optional)")}</span>
        <input name="bondingCapacity" defaultValue={u.bondingCapacity} maxLength={120} className={field} placeholder={tx("e.g. $2M single, $5M aggregate")} data-testid="sub-bonding" />
      </label>
    </section>
  );
}
