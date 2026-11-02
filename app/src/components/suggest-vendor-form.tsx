"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitVendorSuggestion } from "@/actions/vendor-suggestions";
import { useTx } from "@/components/locale-context";
import { btn, field } from "@/components/ui";
import { RELATIONS, RELATION_LABEL, type Relation } from "@/lib/vendor-suggestions";

const label = "mb-1.5 block font-sans text-[12px] font-semibold text-forest";

export function SuggestVendorForm({ categories }: { categories: { id: string; label: string }[] }) {
  const tx = useTx();
  const router = useRouter();
  const [relation, setRelation] = useState<Relation>("WORKED");
  const [nameOk, setNameOk] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setError("");
    setPending(true);
    const result = await submitVendorSuggestion({
      vendorName: String(form.get("vendorName") ?? ""),
      company: String(form.get("company") ?? ""),
      category: String(form.get("category") ?? ""),
      location: String(form.get("location") ?? ""),
      website: String(form.get("website") ?? ""),
      contact: String(form.get("contact") ?? ""),
      note: String(form.get("note") ?? ""),
      relation,
      nameOk,
    }).catch(() => ({ ok: false as const, error: "Could not send that suggestion." }));
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    formEl.reset();
    setDone(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="suggest-vendor-form">
      <div>
        <label className={label} htmlFor="sv-name">{tx("Vendor name")}</label>
        <input id="sv-name" name="vendorName" className={field} maxLength={120} autoComplete="off" />
      </div>
      <div>
        <label className={label} htmlFor="sv-company">{tx("Company")}</label>
        <input id="sv-company" name="company" className={field} maxLength={160} autoComplete="off" />
      </div>
      <div>
        <label className={label} htmlFor="sv-category">{tx("Category")}</label>
        <select id="sv-category" name="category" className={field} required defaultValue="">
          <option value="" disabled>{tx("Choose a category")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{tx(c.label)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={label} htmlFor="sv-location">{tx("City / state")}</label>
        <input id="sv-location" name="location" className={field} required maxLength={120} placeholder="Austin, TX" />
      </div>
      <div>
        <label className={label} htmlFor="sv-website">{tx("Website")}</label>
        <input id="sv-website" name="website" className={field} maxLength={300} inputMode="url" />
      </div>
      <div>
        <label className={label} htmlFor="sv-contact">
          {tx("Email or phone")} <span className="font-normal text-mut">({tx("optional")})</span>
        </label>
        <input id="sv-contact" name="contact" className={field} maxLength={200} />
      </div>
      <fieldset className="sm:col-span-2">
        <legend className={label}>{tx("How do you know them?")}</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {RELATIONS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={relation === id}
              data-testid={`relation-${id}`}
              onClick={() => setRelation(id)}
              className={`min-h-11 rounded-sm border px-4 text-[14px] ${relation === id ? "border-brass bg-[#F6EEDB] font-semibold text-forest" : "border-line bg-paper text-ink"}`}
            >
              {tx(RELATION_LABEL[id])}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <label className={label} htmlFor="sv-note">
          {tx("Note")} <span className="font-normal text-mut">({tx("optional")})</span>
        </label>
        <textarea id="sv-note" name="note" className={`${field} h-24 resize-none`} maxLength={1500} />
      </div>
      <label className="flex items-start gap-3 text-[15px] text-ink sm:col-span-2">
        <input type="checkbox" checked={nameOk} onChange={(e) => setNameOk(e.target.checked)} className="mt-1 h-[18px] w-[18px] accent-[#A8843F]" data-testid="name-ok" />
        <span>{tx("I'm OK with Private Floor mentioning my name when we reach out.")}</span>
      </label>
      {error ? <p className="text-[14px] text-[#8a3b2b] sm:col-span-2" role="alert">{tx(error)}</p> : null}
      {done ? (
        <p className="rounded border border-brass bg-[#F6EEDB] px-3 py-2 text-[14px] text-forest sm:col-span-2" data-testid="suggestion-sent">
          {tx("Thank you. Your suggestion is in review.")}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <button type="submit" className={`${btn} w-full sm:w-auto`} disabled={pending} data-testid="suggest-submit">
          {pending ? tx("Working…") : tx("Submit suggestion")}
        </button>
      </div>
    </form>
  );
}
