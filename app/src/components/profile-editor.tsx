import { saveProfile } from "@/actions/profile";
import { btn } from "@/components/ui";
import { currentLocale } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n/messages";
import { phrase } from "@/lib/i18n/phrases";
import { roleProfile } from "@/lib/role-profile";

const labelCls = "mb-2 block font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-forest";
const field =
  "w-full min-h-12 rounded-sm border border-line bg-paper px-3.5 py-3 font-sans text-[17px] text-forest outline-none placeholder:text-mut/70 focus:border-brass";
const box = "h-5 w-5 shrink-0 accent-[#1F3A2E]";
import { ASSET_CLASSES, DEAL_TYPES, US_STATES } from "@/lib/member-network";

function selected(csv: string) {
  return new Set(csv.split(",").map((item) => item.trim()).filter(Boolean));
}

export async function ProfileEditor({
  member,
}: {
  member: {
    bio: string;
    website: string;
    location: string;
    markets: string;
    dealTypes: string;
    assetClasses: string;
    checkSize: string;
    lookingFor: string;
    offering: string;
    yearsInBusiness?: string;
    typicalJobSize?: string;
    licenses?: string;
    insuranceInfo?: string;
    specialties?: string;
    privateTerms?: string;
    role?: string;
  };
}) {
  const locale = await currentLocale();
  const rp = roleProfile(member.role);
  const t = translator(locale);
  const markets = selected(member.markets);
  const dealTypes = selected(member.dealTypes);
  const assets = selected(member.assetClasses);
  return (
    <form action={saveProfile} className="mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 rounded border border-line bg-cream p-5 sm:p-7">
      <h2 className="font-serif text-2xl text-forest sm:text-[28px]">{t("profile.edit")}</h2>
      <p className="text-[15px] leading-relaxed text-ink">{t("profile.privacy")}</p>
      <label>
        <span className={labelCls}>{t("profile.location")}</span>
        <input name="location" defaultValue={member.location} className={field} required />
      </label>
      <label>
        <span className={labelCls}>{t("profile.website")}</span>
        <input name="website" type="text" inputMode="url" autoCapitalize="none" spellCheck={false} defaultValue={member.website} className={field} placeholder="www.example.com" />
      </label>
      <label>
        <span className={labelCls}>{t("profile.bio")}</span>
        <textarea name="bio" defaultValue={member.bio} rows={3} className={field} />
      </label>
      <fieldset className="min-w-0">
        <legend className={labelCls}>{t("profile.markets")}</legend>
        <div className="grid max-h-72 grid-cols-4 gap-x-2 gap-y-1 overflow-y-auto rounded border border-line bg-paper p-3 text-[16px] sm:grid-cols-6 lg:grid-cols-8">
          {US_STATES.map((state) => (
            <label key={state} className="flex min-h-10 cursor-pointer items-center gap-2">
              <input className={box} type="checkbox" name="markets" value={state} defaultChecked={markets.has(state)} />
              {state}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="min-w-0">
        <legend className={labelCls}>{t("profile.dealTypes")}</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[16px]">
          {DEAL_TYPES.map((item) => (
            <label key={item} className="flex min-h-10 cursor-pointer items-center gap-2">
              <input className={box} type="checkbox" name="dealTypes" value={item} defaultChecked={dealTypes.has(item)} />
              {item}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="min-w-0">
        <legend className={labelCls}>{t("profile.assetClasses")}</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[16px]">
          {ASSET_CLASSES.map((item) => (
            <label key={item} className="flex min-h-10 cursor-pointer items-center gap-2">
              <input className={box} type="checkbox" name="assetClasses" value={item} defaultChecked={assets.has(item)} />
              {item}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        <span className={labelCls}>{t("profile.checkSize")}</span>
        <input name="checkSize" defaultValue={member.checkSize} className={field} placeholder="$1–5M" />
      </label>
      {/* #30: no "What I am looking for" for anyone; developers have no services blurb. Saved data stays in the database. */}
      {member.role !== "DEVELOPER" ? (
        <label data-testid="profile-services">
          <span className={labelCls}>{phrase(locale, "About my services")}</span>
          <textarea name="offering" defaultValue={member.offering} rows={3} maxLength={800} className={field} />
          <span className="mt-1 block font-sans text-[14px] text-mut">{phrase(locale, "A short bio shown on your card when developers look for their team.")}</span>
        </label>
      ) : null}
      {member.role !== "DEVELOPER" ? (
        <div className="grid gap-5 sm:grid-cols-2" data-testid="profile-vendor-fields">
          <label>
            <span className={labelCls}>{phrase(locale, "Years in business")}</span>
            <input name="yearsInBusiness" defaultValue={member.yearsInBusiness ?? ""} maxLength={40} className={field} inputMode="numeric" />
          </label>
          <label>
            <span className={labelCls}>{phrase(locale, rp.size)}</span>
            <input name="typicalJobSize" defaultValue={member.typicalJobSize ?? ""} maxLength={80} className={field} placeholder={phrase(locale, rp.sizeHint)} />
          </label>
          <label className="sm:col-span-2">
            <span className={labelCls}>{phrase(locale, rp.specialties)}</span>
            <input name="specialties" defaultValue={member.specialties ?? ""} maxLength={300} className={field} placeholder={rp.specialtiesHint ? phrase(locale, rp.specialtiesHint) : undefined} />
          </label>
          <label className="sm:col-span-2" data-testid="profile-credential">
            <span className={labelCls}>{phrase(locale, rp.credential)}{rp.credentialRequired ? " *" : ""}</span>
            <textarea name="licenses" defaultValue={member.licenses ?? ""} rows={2} maxLength={400} className={field} placeholder={rp.credentialHint ? phrase(locale, rp.credentialHint) : undefined} />
            {rp.credentialRequired ? <span className="mt-1 block font-sans text-[14px] text-mut">{phrase(locale, "Needed to finish Getting started. Staff check it against public records.")}</span> : null}
          </label>
          <label className="sm:col-span-2">
            <span className={labelCls}>{phrase(locale, "Insurance")}</span>
            <textarea name="insuranceInfo" defaultValue={member.insuranceInfo ?? ""} rows={2} maxLength={400} className={field} />
            <span className="mt-1 block font-sans text-[14px] text-mut">{phrase(locale, "Optional. Shown on your profile to developers.")}</span>
          </label>
          {rp.privateTerms ? (
            <label className="sm:col-span-2" data-testid="profile-private-terms">
              <span className={labelCls}>{phrase(locale, "Rates and terms (private)")}</span>
              <textarea name="privateTerms" defaultValue={member.privateTerms ?? ""} rows={2} maxLength={400} className={field} />
              <span className="mt-1 block font-sans text-[14px] text-mut">{phrase(locale, "Only you see this. Rates and terms are never shown on your profile; discuss them in messages.")}</span>
            </label>
          ) : null}
        </div>
      ) : null}
      <label>
        <span className={labelCls}>{t("profile.card")}</span>
        <input name="card" type="file" accept="image/jpeg,image/png,application/pdf" className="text-[15px]" />
      </label>
      <button className={btn} type="submit">
        {t("profile.save")}
      </button>
    </form>
  );
}
