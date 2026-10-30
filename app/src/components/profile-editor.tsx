import { saveProfile } from "@/actions/profile";
import { btn } from "@/components/ui";

const labelCls = "mb-2 block font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-forest";
const field =
  "w-full min-h-12 rounded-sm border border-line bg-paper px-3.5 py-3 font-sans text-[17px] text-forest outline-none placeholder:text-mut/70 focus:border-brass";
const box = "h-5 w-5 shrink-0 accent-[#1F3A2E]";
import { ASSET_CLASSES, DEAL_TYPES, US_STATES } from "@/lib/member-network";

function selected(csv: string) {
  return new Set(csv.split(",").map((item) => item.trim()).filter(Boolean));
}

export function ProfileEditor({
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
  };
}) {
  const markets = selected(member.markets);
  const dealTypes = selected(member.dealTypes);
  const assets = selected(member.assetClasses);
  return (
    <form action={saveProfile} className="mt-6 grid gap-5 rounded border border-line bg-cream p-5 sm:p-7">
      <h2 className="font-serif text-2xl text-forest sm:text-[28px]">Edit profile</h2>
      <p className="text-[15px] leading-relaxed text-ink">Other members never see your email or phone. A business card stays with your account.</p>
      <label>
        <span className={labelCls}>City and state</span>
        <input name="location" defaultValue={member.location} className={field} required />
      </label>
      <label>
        <span className={labelCls}>Website</span>
        <input name="website" type="text" inputMode="url" autoCapitalize="none" spellCheck={false} defaultValue={member.website} className={field} placeholder="www.example.com" />
      </label>
      <label>
        <span className={labelCls}>Bio</span>
        <textarea name="bio" defaultValue={member.bio} rows={3} className={field} />
      </label>
      <fieldset>
        <legend className={labelCls}>Markets</legend>
        <div className="grid max-h-72 grid-cols-4 gap-x-2 gap-y-1 overflow-y-auto rounded border border-line bg-paper p-3 text-[16px] sm:grid-cols-6 lg:grid-cols-8">
          {US_STATES.map((state) => (
            <label key={state} className="flex min-h-10 cursor-pointer items-center gap-2">
              <input className={box} type="checkbox" name="markets" value={state} defaultChecked={markets.has(state)} />
              {state}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className={labelCls}>Deal types</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[16px]">
          {DEAL_TYPES.map((item) => (
            <label key={item} className="flex min-h-10 cursor-pointer items-center gap-2">
              <input className={box} type="checkbox" name="dealTypes" value={item} defaultChecked={dealTypes.has(item)} />
              {item}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className={labelCls}>Asset classes</legend>
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
        <span className={labelCls}>Check size or deal size</span>
        <input name="checkSize" defaultValue={member.checkSize} className={field} placeholder="$1–5M" />
      </label>
      <label>
        <span className={labelCls}>What I am looking for</span>
        <textarea name="lookingFor" defaultValue={member.lookingFor} rows={3} className={field} />
      </label>
      <label>
        <span className={labelCls}>What I offer</span>
        <textarea name="offering" defaultValue={member.offering} rows={3} className={field} />
      </label>
      <label>
        <span className={labelCls}>Business card, optional</span>
        <input name="card" type="file" accept="image/jpeg,image/png,application/pdf" className="text-[15px]" />
      </label>
      <button className={btn} type="submit">
        Save profile
      </button>
    </form>
  );
}
