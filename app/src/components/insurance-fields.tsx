"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale, useTx } from "@/components/locale-context";
import { field, labelCls } from "@/components/ui";
import { MoneyInput } from "@/components/money-input";
import { INSURANCE_REQUIRED, INSURANCE_TIME_ZONE, MAX_POLICIES, POLICY_TYPES, type PolicyInput } from "@/lib/insurance-compliance";

const control = `${field} min-h-11 min-w-0`;
const action = "inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-forest underline decoration-brass";
const blank: PolicyInput = { type: "", expiresKey: "", otherName: "", limit: "", aggregate: "" };

function PolicyRow({ policy, remove }: { policy: PolicyInput; remove?: () => void }) {
  const tx = useTx();
  return (
    <div className="group grid min-w-0 gap-2 rounded border border-line p-3 sm:grid-cols-2">
      <label className="min-w-0">
        <span className={labelCls}>{tx("Policy type")}</span>
        <select name="policyType" defaultValue={policy.type} className={control}>
          <option value="">—</option>
          {POLICY_TYPES.map(({ id, label }) => <option key={id} value={id}>{tx(label)}</option>)}
        </select>
      </label>
      <label className="min-w-0">
        <span className={labelCls}>{tx("Expiration date")}</span>
        <input name="policyExpiration" type="date" defaultValue={policy.expiresKey} className={control} />
      </label>
      {/* Nov 17 (Richard, decision 5): limits are what other members see; the COI and agent stay with staff. */}
      <label className="min-w-0">
        <span className={labelCls}>{tx("Coverage limit")}</span>
        <MoneyInput name="policyLimit" defaultValue={policy.limit ? String(policy.limit) : ""} className={control} placeholder="" />
      </label>
      <label className="min-w-0">
        <span className={labelCls}>{tx("Aggregate limit (optional)")}</span>
        <MoneyInput name="policyAggregate" defaultValue={policy.aggregate ? String(policy.aggregate) : ""} className={control} placeholder="" />
      </label>
      <label className="hidden min-w-0 group-has-[select:has(option[value=OTHER]:checked)]:block sm:col-span-2">
        <span className={labelCls}>{tx("Coverage name")}</span>
        <input name="policyOtherName" defaultValue={policy.otherName} maxLength={100} className={control} />
      </label>
      {remove ? <button type="button" onClick={remove} className={`${action} justify-self-start`}>{tx("Remove policy")}</button> : null}
    </div>
  );
}

export function InsuranceFields({ application = false, certificate, agent, policies = [], children }: {
  application?: boolean;
  certificate?: { fileName: string; uploadedAt: Date } | null;
  agent?: { insuranceAgentName: string; insuranceAgentEmail: string; insuranceAgentPhone: string };
  policies?: PolicyInput[];
  children?: ReactNode;
}) {
  const tx = useTx();
  const locale = useLocale();
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => setEnhanced(true), []);
  const [rows, setRows] = useState(() => (policies.length ? policies : [blank]).map((policy, id) => ({ id, policy })));
  const [nextId, setNextId] = useState(rows.length);
  const onFile = certificate ? tx("On file: {fileName} · uploaded {date}")
    .replace("{fileName}", () => certificate.fileName)
    .replace("{date}", new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: INSURANCE_TIME_ZONE }).format(certificate.uploadedAt)) : "";

  return (
    <section
      id={application ? undefined : "insurance-compliance"}
      data-testid={application ? "join-insurance" : "insurance-compliance"}
      data-field={application ? "insurance" : undefined}
      className="grid min-w-0 gap-4 rounded border border-line bg-paper p-4 [overflow-wrap:anywhere]"
    >
      <h2 className="font-serif text-2xl">{tx("Insurance")}</h2>
      <p className="text-sm">{tx(INSURANCE_REQUIRED)}</p>
      {certificate ? <a href="/api/insurance-certificates/me" target="_blank" rel="noreferrer" className={action}>{onFile}</a> : null}
      <label className="min-w-0">
        <span className={labelCls}>{tx(certificate ? "Replace certificate of insurance" : "Certificate of insurance")}</span>
        <input name="coi" type="file" accept="application/pdf,image/jpeg,image/png" className="block min-h-11 w-full min-w-0 text-sm file:mr-2 file:min-h-11" />
        <span className="mt-1 block text-sm text-mut">{tx("PDF, JPG or PNG up to 10 MB. Only you and Private Floor staff can see your certificate and agent details. Other members see only your policy types, limits and whether each is current.")}</span>
      </label>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <label className="min-w-0 sm:col-span-2">
          <span className={labelCls}>{tx("Insurance agent name")}</span>
          <input name="insuranceAgentName" defaultValue={agent?.insuranceAgentName} maxLength={120} className={control} />
        </label>
        <label className="min-w-0">
          <span className={labelCls}>{tx("Insurance agent email")}</span>
          <input name="insuranceAgentEmail" inputMode="email" defaultValue={agent?.insuranceAgentEmail} maxLength={254} className={control} />
        </label>
        <label className="min-w-0">
          <span className={labelCls}>{tx("Insurance agent phone")}</span>
          <input name="insuranceAgentPhone" type="tel" defaultValue={agent?.insuranceAgentPhone} maxLength={60} className={control} />
        </label>
      </div>
      <fieldset className="grid min-w-0 gap-2">
        <legend className={labelCls}>{tx("Policies")} *</legend>
        <p className="text-sm text-mut">{tx("Add at least one policy with its type, coverage limit and expiration date. We remind you 30 days before a policy expires.")}</p>
        {rows.map(({ id, policy }) => (
          <PolicyRow key={id} policy={policy} remove={enhanced ? () => setRows((current) => current.filter((row) => row.id !== id)) : undefined} />
        ))}
        {rows.length < MAX_POLICIES && (enhanced ? (
          <button type="button" className={`${action} justify-self-start`} onClick={() => {
            setRows((current) => [...current, { id: nextId, policy: blank }]);
            setNextId(nextId + 1);
          }}>{tx("Add another policy")}</button>
        ) : (
          <details>
            <summary className={action}>{tx("Add another policy")}</summary>
            <div className="grid gap-2">
              {Array.from({ length: MAX_POLICIES - rows.length }, (_, index) => <PolicyRow key={index} policy={blank} />)}
            </div>
          </details>
        ))}
      </fieldset>
      {/* Wrapped so a child's sm:col-span-2 cannot add implicit grid columns to this block. */}
      {children ? <div className="min-w-0">{children}</div> : null}
    </section>
  );
}
