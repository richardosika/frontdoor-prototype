import { saveProfile } from "@/actions/profile";
import { btn, field, labelCls } from "@/components/ui";
import { SIZE_BANDS } from "@/lib/domain";
import { ASSET_CLASSES, DEAL_TYPES, US_STATES } from "@/lib/member-network";
import { ASSET_TYPES, METROS, specialtiesForRole } from "@/lib/platform/catalog";

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
    role?: string;
    homeCity?: string;
    homeState?: string;
    homeMetro?: string;
    nationwide?: boolean;
    operateMetros?: string[];
    assetSlugs?: string[];
    specialtySlugs?: string[];
    audiences?: { lookingFor?: string; offering?: string; checkSize?: string };
  };
}) {
  const markets = selected(member.markets);
  const dealTypes = selected(member.dealTypes);
  const assets = selected(member.assetClasses);
  const focus = new Set(member.assetSlugs ?? []);
  const specs = new Set(member.specialtySlugs ?? []);
  const metros = new Set(member.operateMetros ?? []);
  const roleSpecialties = specialtiesForRole(member.role || "");
  return (
    <form action={saveProfile} className="mt-5 grid gap-3 rounded border border-line bg-cream p-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Edit profile</h2>
      <p className="text-xs text-ink">Other members never see your email or phone. A business card stays with your account.</p>
      <label>
        <span className={labelCls}>City and state</span>
        <input name="location" defaultValue={member.location} className={field} required />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          <span className={labelCls}>Home city</span>
          <input name="homeCity" defaultValue={member.homeCity || ""} className={field} />
        </label>
        <label>
          <span className={labelCls}>Home state</span>
          <select name="homeState" defaultValue={member.homeState || ""} className={field}>
            <option value="">Select</option>
            {US_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>Home metro</span>
          <select name="homeMetro" defaultValue={member.homeMetro || ""} className={field}>
            <option value="">City and state</option>
            {METROS.map((metro) => (
              <option key={metro.code} value={metro.code}>
                {metro.short}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="nationwide" defaultChecked={member.nationwide} />
        Works nationwide
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
        <span className={labelCls}>Deal size band</span>
        <select name="dealSize" defaultValue={SIZE_BANDS.some((item) => item.id === member.checkSize) ? member.checkSize : ""} className={field}>
          <option value="">Use the note below</option>
          {SIZE_BANDS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className={labelCls}>Check size or deal size</span>
        <input name="checkSize" defaultValue={member.checkSize} className={field} placeholder="$1–5M" />
      </label>
      <fieldset>
        <legend className={labelCls}>Operating metros</legend>
        <select name="operateMetros" multiple defaultValue={[...metros]} className={`${field} min-h-28`}>
          {METROS.map((metro) => (
            <option key={metro.code} value={metro.code}>
              {metro.short}
            </option>
          ))}
        </select>
      </fieldset>
      <label>
        <span className={labelCls}>How you work with these assets</span>
        <select name="stance" defaultValue="SERVES" className={field}>
          <option value="DEVELOPS">Develops</option>
          <option value="OPERATES">Operates</option>
          <option value="SERVES">Serves</option>
          <option value="INVESTS">Invests</option>
          <option value="LENDS">Lends</option>
        </select>
      </label>
      <fieldset>
        <legend className={labelCls}>Asset focus</legend>
        <div className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto rounded border border-line bg-paper p-2 text-sm sm:grid-cols-2">
          {ASSET_TYPES.map((item) => (
            <label key={item.slug} className="flex items-center gap-1">
              <input type="checkbox" name="asset" value={item.slug} defaultChecked={focus.has(item.slug)} />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>
      {roleSpecialties.length ? (
        <fieldset>
          <legend className={labelCls}>Specialties</legend>
          <div className="flex flex-wrap gap-2 text-sm">
            {roleSpecialties.map((item) => (
              <label key={item.slug} className="flex items-center gap-1">
                <input type="checkbox" name="specialty" value={item.slug} defaultChecked={specs.has(item.slug)} />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <fieldset>
        <legend className={labelCls}>Who can see looking for, offering, and deal size</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <AudienceSelect name="audienceLookingFor" label="Looking for" value={member.audiences?.lookingFor} />
          <AudienceSelect name="audienceOffering" label="Offering" value={member.audiences?.offering} />
          <AudienceSelect name="audienceCheckSize" label="Deal size" value={member.audiences?.checkSize} />
        </div>
      </fieldset>
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

function AudienceSelect({ name, label, value }: { name: string; label: string; value?: string }) {
  return (
    <label>
      <span className={labelCls}>{label}</span>
      <select name={name} defaultValue={value || "MEMBERS"} className={field}>
        <option value="MEMBERS">Members</option>
        <option value="CONNECTIONS">Connections only</option>
        <option value="PRIVATE">Private</option>
      </select>
    </label>
  );
}
