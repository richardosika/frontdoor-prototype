import { saveProfile } from "@/actions/profile";
import { btn, field, labelCls } from "@/components/ui";
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
    <form action={saveProfile} className="mt-5 grid gap-3 rounded border border-line bg-cream p-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Edit profile</h2>
      <p className="text-xs text-ink">Other members never see your email or phone. A business card stays with your account.</p>
      <label>
        <span className={labelCls}>City and state</span>
        <input name="location" defaultValue={member.location} className={field} required />
      </label>
      <label>
        <span className={labelCls}>Website</span>
        <input name="website" defaultValue={member.website} className={field} placeholder="https://" />
      </label>
      <label>
        <span className={labelCls}>Bio</span>
        <textarea name="bio" defaultValue={member.bio} rows={3} className={field} />
      </label>
      <fieldset>
        <legend className={labelCls}>Markets</legend>
        <div className="grid max-h-40 grid-cols-6 gap-1 overflow-y-auto rounded border border-line bg-paper p-2 text-xs">
          {US_STATES.map((state) => (
            <label key={state} className="flex items-center gap-1">
              <input type="checkbox" name="markets" value={state} defaultChecked={markets.has(state)} />
              {state}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className={labelCls}>Deal types</legend>
        <div className="flex flex-wrap gap-2 text-sm">
          {DEAL_TYPES.map((item) => (
            <label key={item} className="flex items-center gap-1">
              <input type="checkbox" name="dealTypes" value={item} defaultChecked={dealTypes.has(item)} />
              {item}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className={labelCls}>Asset classes</legend>
        <div className="flex flex-wrap gap-2 text-sm">
          {ASSET_CLASSES.map((item) => (
            <label key={item} className="flex items-center gap-1">
              <input type="checkbox" name="assetClasses" value={item} defaultChecked={assets.has(item)} />
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
        <input name="card" type="file" accept="image/jpeg,image/png,application/pdf" className="text-sm" />
      </label>
      <button className={btn} type="submit">
        Save profile
      </button>
    </form>
  );
}
