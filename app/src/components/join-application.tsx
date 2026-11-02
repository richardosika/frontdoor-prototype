"use client";

import { createContext, useContext, useState } from "react";
import { useTx } from "@/components/locale-context";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkJoinEmail, submitJoinApplication } from "@/actions/join";
import { MEMBER_RISK_ERROR, MEMBER_RISK_HREF, MEMBER_RISK_LABEL } from "@/lib/member-risk";
import { MEMBER_NDA_ERROR, MEMBER_NDA_HREF, MEMBER_NDA_LABEL } from "@/lib/member-nda-copy";
import { btn, btnOutline, field, labelCls } from "@/components/ui";
import {
  ATTORNEY_SPECIALTIES,
  COVERAGE_TYPES,
  DEAL_COUNTS,
  DEAL_SIZES,
  HOLD_PERIODS,
  INVESTMENT_RANGES,
  INVESTOR_TYPES,
  JOIN_PROPERTY_TYPES,
  JOIN_REGIONS,
  JOIN_ROLES,
  LENDER_TYPES,
  LINK_KINDS,
  LOAN_GROUPS,
  PARTICIPATION,
  ROLE_SPECIALTIES,
  companyFieldsOptional,
  joinErrorField,
  websiteOptional,
  emptyProfile,
  pageKind,
  pageOneErrors,
  pageTwoErrors,
  projectsRequired,
  showsProjects,
  showsStateList,
  stateListCopy,
  type JoinProfile,
  type JoinProject,
  type JoinState,
} from "@/lib/join-form";
import { US_STATES } from "@/lib/member-network";
import { SEEK_CATEGORIES, categoryForRole } from "@/lib/project-contact";
import { publicStatusPath } from "@/lib/public-status";

const RQ = <span className="text-[#9b2c22]"> *</span>;

type FieldIssue = { key: string; message: string } | null;
const IssueContext = createContext<FieldIssue>(null);

/** Inline error shown directly under the field that failed. */
function FieldError({ name }: { name: string }) {
  const issue = useContext(IssueContext);
  const tx = useTx();
  if (!issue || issue.key !== name) return null;
  return (
    <p id={`join-error-${name}`} role="alert" className="mt-1 text-sm font-semibold text-[#9b2c22]">
      {tx(issue.message)}
    </p>
  );
}

function Spinner() {
  return <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px]" />;
}

function ChipSet({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const tx = useTx();
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const on = value.includes(option);
        return (
          <label key={option} className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm ${on ? "border-brass bg-cream" : "border-line bg-paper"}`}>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={on}
              onChange={() => onChange(on ? value.filter((item) => item !== option) : [...value, option])}
            />
            {tx(option)}
          </label>
        );
      })}
    </div>
  );
}

export function JoinApplication({
  initialCode = "",
  initialStep = 1,
  initialRole = "DEVELOPER",
  termsLabel,
  verificationLabel,
}: {
  initialCode?: string;
  initialStep?: 1 | 2;
  initialRole?: string;
  termsLabel: string;
  verificationLabel: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [profile, setProfile] = useState<JoinProfile>(() => emptyProfile(initialRole, initialCode));
  const [error, setError] = useState("");
  const [alert, setAlert] = useState<{ title: string; detail: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [riskError, setRiskError] = useState(false);
  const [ndaError, setNdaError] = useState(false);
  const [cardName, setCardName] = useState("");
  const [issue, setIssue] = useState<FieldIssue>(null);
  const tx = useTx();

  function patch(partial: Partial<JoinProfile>) {
    setProfile((current) => ({ ...current, ...partial }));
    if (issue && issue.key in partial) {
      setIssue(null);
      setError("");
    }
  }

  /** Show the error next to its field, scroll there, and focus the input. Unknown fields fall back to the top banner. */
  function showIssue(message: string) {
    const key = joinErrorField(message);
    setIssue({ key, message });
    setError(message);
    requestAnimationFrame(() => {
      const box = document.querySelector<HTMLElement>(`[data-field="${key}"]`);
      if (!box) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      box.scrollIntoView({ block: "center", behavior: "smooth" });
      const input = box.matches("input,select,textarea") ? box : box.querySelector<HTMLElement>("input,select,textarea");
      input?.focus({ preventScroll: true });
    });
  }
  const inlineShown = () => !!issue && typeof document !== "undefined" && !!document.querySelector(`[data-field="${issue.key}"]`);

  async function onEmailBlur(email: string) {
    const result = await checkJoinEmail(email);
    if (!result.ok) setAlert({ title: result.title, detail: result.detail });
    else setAlert((current) => (current?.title.startsWith("A request for this email") ? null : current));
  }

  function continuePage() {
    const issues = pageOneErrors(profile);
    if (alert) return;
    if (issues.length) {
      showIssue(issues[0]);
      return;
    }
    setError("");
    setIssue(null);
    setStep(2);
    window.scrollTo(0, 0);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRiskError(profile.acceptMemberRisk !== true);
    setNdaError(profile.acceptMemberNda !== true);
    const issues = pageTwoErrors(profile);
    if (issues.length) {
      showIssue(issues[0]);
      return;
    }
    setPending(true);
    setError("");
    setIssue(null);
    const data = new FormData(event.currentTarget);
    data.set("profile", JSON.stringify(profile));
    let result: Awaited<ReturnType<typeof submitJoinApplication>>;
    try {
      result = await submitJoinApplication(data);
    } catch {
      setPending(false);
      showIssue("The application could not be sent. Check your connection and try again.");
      return;
    }
    if (!result.ok) {
      setPending(false);
      // A server-side rule on a step 1 field (company website, email) sends the applicant back to that field.
      const key = joinErrorField(result.error);
      if (["firstName", "lastName", "email", "phone", "role", "company", "website", "street", "city", "state", "zip", "links"].includes(key)) setStep(1);
      showIssue(result.error);
      return;
    }
    // Keep the in-progress state on screen until the status page loads.
    router.push(publicStatusPath(result.statusToken));
  }

  const kind = pageKind(profile.role);
  const companyOptional = companyFieldsOptional(profile.role);
  const siteOptional = websiteOptional(profile.role);
  const stateCopy = stateListCopy(profile.role);
  const specialty = ROLE_SPECIALTIES[profile.role as keyof typeof ROLE_SPECIALTIES];

  return (
    <IssueContext.Provider value={issue}>
    <div className="mx-auto w-full max-w-3xl overflow-x-hidden px-4 py-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">{tx("Private Floor Club · Membership")}</p>
      <h1 className="mt-2 font-serif text-4xl font-normal text-forest">{step === 2 ? tx("Tell us about your business") : tx("Request to join")}</h1>
      <p className="mt-2 text-sm text-ink">
        {step === 2 ? tx("This helps our team review your request. Optional fields can be left blank.") : tx("A short first step. Every request is personally reviewed.")}
      </p>
      <p className="mt-4 text-xs uppercase tracking-[0.12em] text-mut">{tx("Step {step} of 2").replace("{step}", String(step))}</p>
      <div className="mt-2 h-1 rounded bg-line">
        <div className="h-1 rounded bg-brass" style={{ width: step === 1 ? "50%" : "100%" }} />
      </div>

      {step === 1 ? (
        <form
          className="mt-6 rounded border border-line border-t-[3px] border-t-brass bg-cream p-4 sm:p-8"
          onSubmit={(event) => {
            event.preventDefault();
            continuePage();
          }}
        >
          <p className="mb-4 text-right text-sm text-mut"><span className="text-[#9b2c22]">*</span> {tx("Required")}</p>
          {alert ? (
            <div role="alert" className="mb-4 border border-[#9b2c22] border-l-4 bg-[#fbefec] p-4 text-[#9b2c22]">
              <b className="block">{tx(alert.title)}</b>
              <p className="mt-1 text-sm">{tx(alert.detail)}</p>
            </div>
          ) : null}
          {error && !inlineShown() ? <p role="alert" className="mb-4 text-sm font-semibold text-[#9b2c22]">{tx(error)}</p> : null}
          <h2 className="font-serif text-2xl font-normal">{tx("About you")}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field name="firstName" label="First name" required value={profile.firstName} onChange={(value) => patch({ firstName: value })} />
            <Field name="lastName" label="Last name" required value={profile.lastName} onChange={(value) => patch({ lastName: value })} />
            <Field name="email" label="Work email" required type="email" value={profile.email} onChange={(value) => patch({ email: value })} onBlur={onEmailBlur} />
            <Field name="phone" label="Mobile phone" required type="tel" value={profile.phone} onChange={(value) => patch({ phone: value })} />
            <label className="sm:col-span-2" data-field="role">
              <span className={labelCls}>{tx("Role")}{RQ}</span>
              <select className={field} value={profile.role} onChange={(event) => patch({ role: event.target.value })}>
                {JOIN_ROLES.map((role) => (
                  <option key={role.id} value={role.id}>{tx(role.label)}</option>
                ))}
              </select>
            </label>
            {/* #42: an applicant may cover more than one category. */}
            <fieldset className="sm:col-span-2" data-testid="join-extra-categories">
              <legend className={labelCls}>{tx("Other categories you also cover (optional)")}</legend>
              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                {SEEK_CATEGORIES.filter((item) => item.id !== categoryForRole(profile.role)).map((item) => {
                  const picked = (profile.extraCategories ?? []).includes(item.id);
                  return (
                    <label key={item.id} className="flex min-h-11 items-center gap-3 text-[15px]">
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0 accent-[#1F3A2E]"
                        checked={picked}
                        onChange={() =>
                          patch({ extraCategories: picked ? (profile.extraCategories ?? []).filter((id) => id !== item.id) : [...(profile.extraCategories ?? []), item.id] })
                        }
                      />
                      <span>{tx(item.label)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
          <h2 className="mt-6 font-serif text-2xl font-normal">{tx("Your company")}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field name="company" label="Company name" required={!companyOptional} optional={companyOptional} value={profile.company} onChange={(value) => patch({ company: value })} />
            <Field name="website" label="Company website" inputMode="url" required={!siteOptional} optional={siteOptional} value={profile.website} onChange={(value) => patch({ website: value })} />
            <label className="sm:col-span-2" data-field="street">
              <span className={labelCls}>{tx("Business street address")}{RQ}</span>
              <input className={field} aria-invalid={issue?.key === "street" || undefined} value={profile.street} onChange={(event) => patch({ street: event.target.value })} />
              <FieldError name="street" />
            </label>
            <Field label="Suite / unit" optional value={profile.suite} onChange={(value) => patch({ suite: value })} />
            <Field name="city" label="City" required value={profile.city} onChange={(value) => patch({ city: value })} />
            <label data-field="state">
              <span className={labelCls}>{tx("State")}{RQ}</span>
              <select className={field} value={profile.state} onChange={(event) => patch({ state: event.target.value })}>
                <option value="">{tx("Select a state")}</option>
                {US_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              <FieldError name="state" />
            </label>
            <Field name="zip" label="ZIP" required value={profile.zip} onChange={(value) => patch({ zip: value })} />
          </div>
          <h2 className="mt-6 font-serif text-2xl font-normal">{tx("Professional profile")}{RQ}</h2>
          <p className="mt-1 text-sm text-mut">{tx("Required: at least one link to LinkedIn (personal or company), or a business Instagram, Facebook, or YouTube page.")}</p>
          <div className="mt-3 space-y-2" data-field="links">
            <FieldError name="links" />
            {profile.links.map((link, index) => (
              <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[200px_1fr_44px]">
                <select className={field} value={link.kind} onChange={(event) => {
                  const links = profile.links.slice();
                  links[index] = { ...link, kind: event.target.value };
                  patch({ links });
                }}>
                  {LINK_KINDS.map((kind) => <option key={kind}>{kind}</option>)}
                </select>
                <input className={field} type="text" inputMode="url" autoCapitalize="none" spellCheck={false} placeholder="linkedin.com/in/yourname" value={link.url} onChange={(event) => {
                  const links = profile.links.slice();
                  links[index] = { ...link, url: event.target.value };
                  patch({ links });
                }} />
                <button type="button" className={btnOutline} aria-label={tx("Remove")} onClick={() => patch({ links: profile.links.filter((_, item) => item !== index) })}>×</button>
              </div>
            ))}
            <button type="button" className={btnOutline} onClick={() => patch({ links: [...profile.links, { kind: LINK_KINDS[0], url: "" }] })}>{tx("+ Add another link")}</button>
          </div>
          <div className="mt-4 max-w-sm">
            <Field label="Referral code" optional value={profile.referralCode} onChange={(value) => patch({ referralCode: value })} />
          </div>
          <div className="mt-6 flex justify-end">
            <button className={btn} type="submit">{tx("Continue")}</button>
          </div>
        </form>
      ) : (
        <form className="mt-6 min-w-0 rounded border border-line border-t-[3px] border-t-brass bg-cream p-4 sm:p-8" onSubmit={submit} aria-busy={pending || undefined}>
          <fieldset disabled={pending} className="min-w-0 border-0 p-0 m-0 disabled:opacity-70">
          <p className="mb-4 text-right text-sm text-mut"><span className="text-[#9b2c22]">*</span> {tx("Required")}</p>
          {error && !inlineShown() ? <p role="alert" className="mb-4 text-sm font-semibold text-[#9b2c22]">{tx(error)}</p> : null}
          <h2 className="font-serif text-2xl font-normal">{tx("Company details")}</h2>
          <p className="text-sm text-mut">{tx("Your company name and website come from step 1.")}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Exact legal name" optional value={profile.legalName} onChange={(value) => patch({ legalName: value })} />
            <Field label="State of formation" optional value={profile.formationState} onChange={(value) => patch({ formationState: value })} />
            <label className="sm:col-span-2">
              <span className={labelCls}>{tx("What makes your company stand out (optional)")}</span>
              <textarea className={field} rows={3} value={profile.standout} onChange={(event) => patch({ standout: event.target.value })} />
            </label>
            <Field name="title" label="Your title" required value={profile.title} onChange={(value) => patch({ title: value })} />
            <Field label="Year founded" optional value={profile.yearFounded} onChange={(value) => patch({ yearFounded: value })} />
            <Field label="Your name as it appears professionally" optional value={profile.professionalName} onChange={(value) => patch({ professionalName: value })} />
            <Field label="Former names or companies" optional value={profile.formerNames} onChange={(value) => patch({ formerNames: value })} />
            <label className="sm:col-span-2">
              <span className={labelCls}>{tx("Link to your bio or team page (optional)")}</span>
              <input className={field} type="text" inputMode="url" autoCapitalize="none" value={profile.bioUrl} onChange={(event) => patch({ bioUrl: event.target.value })} />
            </label>
          </div>

          <h2 className="mt-6 font-serif text-2xl font-normal">{tx("Where and what you work on")}</h2>
          <div className="mt-3 space-y-4">
            <div data-field="regions">
              <p className={labelCls}>{tx("Regions")}{RQ}</p>
              <FieldError name="regions" />
              <ChipSet options={JOIN_REGIONS} value={profile.regions} onChange={(regions) => patch({ regions })} />
            </div>
            <div data-field="propertyTypes">
              <p className={labelCls}>{tx("Property types")}{RQ}</p>
              <FieldError name="propertyTypes" />
              <ChipSet options={JOIN_PROPERTY_TYPES} value={profile.propertyTypes} onChange={(propertyTypes) => patch({ propertyTypes })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField label="Typical project or deal size range" optional value={profile.dealSize} options={DEAL_SIZES} onChange={(dealSize) => patch({ dealSize })} />
              <SelectField label="Projects or deals in the last 3 years" optional value={profile.dealCount} options={DEAL_COUNTS} onChange={(dealCount) => patch({ dealCount })} />
            </div>
          </div>

          <section className="mt-6 min-w-0 rounded border border-brass bg-[#fbf5e6] p-4" data-role-details={profile.role} data-field="roleDetails">
            <FieldError name="roleDetails" />
            <h2 className="font-serif text-2xl font-normal">{tx(JOIN_ROLES.find((role) => role.id === profile.role)?.label ?? "")}</h2>
            {kind === "developer" ? (
              <DeveloperFields profile={profile} onChange={patch} />
            ) : null}
            {showsStateList(profile.role) ? (
              <StateList
                title={stateCopy.title}
                licensedLabel={stateCopy.licensed}
                numberLabel={stateCopy.number}
                rows={profile.states}
                onChange={(states) => patch({ states })}
              />
            ) : null}
            {kind === "attorney" ? (
              <div className="mt-3">
                <p className={labelCls}>{tx("Real estate specialties")}{RQ}</p>
                <ChipSet options={ATTORNEY_SPECIALTIES} value={profile.specialties} onChange={(specialties) => patch({ specialties })} />
              </div>
            ) : null}
            {specialty ? (
              <div className="mt-3">
                <p className={labelCls}>{tx(specialty.label)}{RQ}</p>
                <ChipSet options={specialty.options} value={profile.specialties} onChange={(specialties) => patch({ specialties })} />
              </div>
            ) : null}
            {kind === "lender" ? (
              <div className="mt-3 space-y-3">
                <div>
                  <p className={labelCls}>{tx("Lender type (optional)")}</p>
                  <ChipSet options={LENDER_TYPES} value={profile.lenderTypes} onChange={(lenderTypes) => patch({ lenderTypes })} />
                </div>
                <SelectField label="Typical loan size" required value={profile.loanSize} options={DEAL_SIZES} onChange={(loanSize) => patch({ loanSize })} />
                <div>
                  <p className={labelCls}>{tx("Loan types")}{RQ}</p>
                  {LOAN_GROUPS.map((group) => (
                    <div key={group.group} className="mt-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brass">{tx(group.group)}</p>
                      <ChipSet options={group.types} value={profile.loanTypes} onChange={(loanTypes) => patch({ loanTypes })} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {kind === "investor" || kind === "family" ? (
              <div className="mt-3 space-y-3">
                <div>
                  <p className={labelCls}>{tx("How you want to participate")}{RQ}</p>
                  <ChipSet options={PARTICIPATION} value={profile.participation} onChange={(participation) => patch({ participation })} />
                </div>
                <SelectField label="Typical hold period" optional value={profile.holdPeriod} options={HOLD_PERIODS} onChange={(holdPeriod) => patch({ holdPeriod })} />
                {kind === "investor" ? (
                  <>
                    <SelectField label="Accredited investor?" optional value={profile.accredited} options={["Yes", "No", "Prefer not to say"]} onChange={(accredited) => patch({ accredited })} />
                    <Field label="Investing entity's legal name" optional value={profile.entityName} onChange={(value) => patch({ entityName: value })} />
                    <Field label="State of formation" optional value={profile.entityState} onChange={(value) => patch({ entityState: value })} />
                    <div>
                      <p className={labelCls}>{tx("Investor type")}{RQ}</p>
                      <ChipSet options={INVESTOR_TYPES} value={profile.investorTypes} onChange={(investorTypes) => patch({ investorTypes })} />
                    </div>
                    <SelectField label="Typical investment range" optional value={profile.investmentRange} options={INVESTMENT_RANGES} onChange={(investmentRange) => patch({ investmentRange })} />
                    <Field label="SEC CIK" optional value={profile.secCik} onChange={(value) => patch({ secCik: value })} />
                  </>
                ) : (
                  <div className="rounded border-l-[3px] border-brass bg-[#f6edd6] p-3 text-sm text-ink">
                    <b className="block text-forest">{tx("Your privacy")}</b>
                    {tx("We know family offices value privacy. The details below are optional and are used only to verify your application. They are never shown to other members.")}
                    <div className="mt-3 grid gap-3">
                      <Field label="Office entity's legal name" optional value={profile.entityName} onChange={(value) => patch({ entityName: value })} />
                      <Field label="State of formation" optional value={profile.entityState} onChange={(value) => patch({ entityState: value })} />
                      <Field label="SEC adviser CRD number" optional value={profile.secCrd} onChange={(value) => patch({ secCrd: value })} />
                      <Field label="SEC CIK / Form D filer" optional value={profile.secCik} onChange={(value) => patch({ secCik: value })} />
                      <Field label="Principal's operating company" optional value={profile.principalCompany} onChange={(value) => patch({ principalCompany: value })} />
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            {profile.role === "INSURANCE" ? (
              <div className="mt-3">
                <p className={labelCls}>{tx("Insurance lines / coverage types")}{RQ}</p>
                <ChipSet options={COVERAGE_TYPES} value={profile.coverageTypes} onChange={(coverageTypes) => patch({ coverageTypes })} />
              </div>
            ) : null}
            {profile.role === "BROKER" ? <Field label="Brokerage profile URL" inputMode="url" optional value={profile.brokerageUrl} onChange={(value) => patch({ brokerageUrl: value })} /> : null}
          </section>

          {showsProjects(profile.role) ? (
            <section className="mt-6" data-projects={profile.role}>
              <h2 className="font-serif text-2xl font-normal">{tx("Recent projects")}{projectsRequired(profile.role) ? RQ : null}</h2>
              <p className="text-sm text-mut">
                {projectsRequired(profile.role)
                  ? tx("General contractors: exactly 2 recent projects are required (name, project city, your role).")
                  : tx("Up to three recent projects. Optional.")}
              </p>
              <ProjectList
                required={projectsRequired(profile.role)}
                projects={profile.projects}
                onChange={(projects) => patch({ projects })}
              />
            </section>
          ) : null}

          <h2 className="mt-6 font-serif text-2xl font-normal">{tx("Press (optional)")}</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input className={field} inputMode="url" placeholder="example.com/article" value={profile.press[0]} onChange={(event) => patch({ press: [event.target.value, profile.press[1] || ""] })} />
            <input className={field} inputMode="url" placeholder="example.com/article" value={profile.press[1]} onChange={(event) => patch({ press: [profile.press[0] || "", event.target.value] })} />
          </div>
          <h2 className="mt-6 font-serif text-2xl font-normal">{tx("Business card or email signature (optional)")}</h2>
          <label className="mt-2 block rounded border border-dashed border-line bg-paper p-4 text-center text-sm text-mut">
            {tx("Upload a business card or company email signature")}
            <input name="businessCard" type="file" accept="image/jpeg,image/png,application/pdf" className="mt-2 block w-full text-sm" onChange={(event) => setCardName(event.target.files?.[0]?.name || "")} />
          </label>
          <p className="mt-2 text-sm font-semibold italic text-brass">{tx("Highly encouraged")}</p>
          {cardName ? <p className="text-sm">{cardName}</p> : null}
          <h2 className="mt-6 font-serif text-2xl font-normal">{tx("Professional reference (optional)")}</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Field label="Name" value={profile.referenceName} onChange={(value) => patch({ referenceName: value })} />
            <Field label="Company" value={profile.referenceCompany} onChange={(value) => patch({ referenceCompany: value })} />
            <label className="sm:col-span-2">
              <span className={labelCls}>{tx("Email or phone")}</span>
              <input className={field} value={profile.referenceContact} onChange={(event) => patch({ referenceContact: event.target.value })} />
            </label>
          </div>
          <h2 className="mt-6 font-serif text-2xl font-normal">{tx("What are you looking for on Private Floor? (optional)")}</h2>
          <textarea className={`${field} mt-2`} rows={3} value={profile.lookingFor} onChange={(event) => patch({ lookingFor: event.target.value })} />
          <h2 className="mt-6 font-serif text-2xl font-normal">{tx("Your sign-in")}</h2>
          <div className="mt-2 max-w-sm">
            <Field name="password" label="Password" required type="password" value={profile.password} onChange={(value) => patch({ password: value })} />
          </div>
          <FieldError name="acceptTerms" />
          <label className="mt-4 flex items-start gap-2 text-sm" data-field="acceptTerms">
            <input type="checkbox" className="mt-1" checked={profile.acceptTerms} onChange={(event) => patch({ acceptTerms: event.target.checked })} />
            <span>{tx(termsLabel)}</span>
          </label>
          <label className="mt-2 flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={profile.acceptVerification} onChange={(event) => patch({ acceptVerification: event.target.checked })} />
            <span>{tx(verificationLabel)}</span>
          </label>
          <label className={`mt-3 flex items-start gap-2 rounded-sm border p-3 text-sm ${riskError ? "border-[#9b2c22] bg-[#9b2c22]/5" : "border-brass/60 bg-paper"}`} data-testid="member-risk" data-field="acceptMemberRisk">
            <input
              type="checkbox"
              name="acceptMemberRisk"
              className="mt-1 h-5 w-5 shrink-0"
              aria-required="true"
              aria-invalid={riskError ? true : undefined}
              aria-describedby={riskError ? "member-risk-error" : undefined}
              checked={profile.acceptMemberRisk === true}
              onChange={(event) => {
                patch({ acceptMemberRisk: event.target.checked });
                if (event.target.checked) setRiskError(false);
              }}
            />
            <span>
              {tx(MEMBER_RISK_LABEL)}{" "}
              <a href={MEMBER_RISK_HREF} target="_blank" rel="noreferrer" className="font-semibold underline decoration-brass">
                {tx("Read the Member Terms")}
              </a>
            </span>
          </label>
          {riskError ? (
            <p id="member-risk-error" role="alert" className="mt-1 text-sm font-semibold text-[#9b2c22]">
              {tx(MEMBER_RISK_ERROR)}
            </p>
          ) : null}
          <label className={`mt-3 flex items-start gap-2 rounded-sm border p-3 text-sm ${ndaError ? "border-[#9b2c22] bg-[#9b2c22]/5" : "border-brass/60 bg-paper"}`} data-testid="member-nda" data-field="acceptMemberNda">
            <input
              type="checkbox"
              name="acceptMemberNda"
              className="mt-1 h-5 w-5 shrink-0"
              aria-required="true"
              aria-invalid={ndaError ? true : undefined}
              aria-describedby={ndaError ? "member-nda-error" : undefined}
              checked={profile.acceptMemberNda === true}
              onChange={(event) => {
                patch({ acceptMemberNda: event.target.checked });
                if (event.target.checked) setNdaError(false);
              }}
            />
            <span>
              {tx(MEMBER_NDA_LABEL)}{" "}
              <a href={MEMBER_NDA_HREF} target="_blank" rel="noreferrer" className="font-semibold underline decoration-brass">
                {tx("Read the Member NDA")}
              </a>
            </span>
          </label>
          {ndaError ? (
            <p id="member-nda-error" role="alert" className="mt-1 text-sm font-semibold text-[#9b2c22]">
              {tx(MEMBER_NDA_ERROR)}
            </p>
          ) : null}
          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-between">
            <button className={btnOutline} type="button" onClick={() => { setStep(1); window.scrollTo(0, 0); }}>{tx("Back")}</button>
            <button className={btn} type="submit" disabled={pending} aria-busy={pending || undefined}>
              {pending ? <span className="inline-flex items-center gap-2"><Spinner />{tx("Submitting your application…")}</span> : tx("Submit request")}
            </button>
          </div>
          {pending ? (
            <p role="status" aria-live="polite" className="mt-3 flex items-center justify-center gap-2 rounded border border-brass/60 bg-paper p-3 text-sm text-forest sm:justify-end">
              <Spinner />
              {tx("Submitting your application… This takes a few seconds. Keep this page open.")}
            </p>
          ) : null}
          </fieldset>
        </form>
      )}
    </div>
    </IssueContext.Provider>
  );
}

function Field({
  name,
  label,
  value,
  onChange,
  required,
  optional,
  type = "text",
  inputMode,
  onBlur,
}: {
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  optional?: boolean;
  type?: string;
  inputMode?: "url" | "text";
  onBlur?: (value: string) => void;
}) {
  const issue = useContext(IssueContext);
  const tx = useTx();
  const invalid = !!name && issue?.key === name;
  return (
    <label className="min-w-0" data-field={name}>
      <span className={labelCls}>{tx(label)}{required ? RQ : null}{optional ? ` ${tx("(optional)")}` : ""}</span>
      <input name={name ? `join-${name}` : undefined} aria-invalid={invalid || undefined} aria-describedby={invalid ? `join-error-${name}` : undefined} className={`${field}${invalid ? " border-[#9b2c22]" : ""}`} type={type} inputMode={inputMode} autoCapitalize={inputMode === "url" ? "none" : undefined} spellCheck={inputMode === "url" ? false : undefined} placeholder={inputMode === "url" ? "example.com" : undefined} value={value} onChange={(event) => onChange(event.target.value)} onBlur={(event) => onBlur?.(event.target.value)} />
      {name ? <FieldError name={name} /> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  required,
  optional,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  required?: boolean;
  optional?: boolean;
}) {
  const tx = useTx();
  return (
    <label className="min-w-0">
      <span className={labelCls}>{tx(label)}{required ? RQ : null}{optional ? ` ${tx("(optional)")}` : ""}</span>
      <select className={field} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{tx("Select")}</option>
        {options.map((option) => <option key={option} value={option}>{tx(option)}</option>)}
      </select>
    </label>
  );
}

function StateList({
  title,
  licensedLabel,
  numberLabel,
  rows,
  onChange,
}: {
  title: string;
  licensedLabel: string;
  numberLabel: string;
  rows: JoinState[];
  onChange: (rows: JoinState[]) => void;
}) {
  const tx = useTx();
  function update(index: number, partial: Partial<JoinState>) {
    onChange(rows.map((row, item) => (item === index ? { ...row, ...partial } : row)));
  }
  return (
    <div className="mt-3 min-w-0">
      <p className={labelCls}>{tx(title)}{RQ}</p>
      <p className="mb-2 text-sm text-mut">{tx("At least one state is required, up to 5. License numbers are optional.")}</p>
      {rows.map((row, index) => (
        <div key={index} className="mb-2 grid min-w-0 grid-cols-1 gap-2 rounded border border-line bg-paper p-2 sm:grid-cols-[160px_1fr_1fr_44px]">
          <select className={field} value={row.state} onChange={(event) => update(index, { state: event.target.value })}>
            <option value="">{tx("Select")}</option>
            {US_STATES.map((state) => <option key={state}>{state}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={row.licensed} onChange={(event) => update(index, { licensed: event.target.checked })} />
            {tx(licensedLabel)}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={row.looking} onChange={(event) => update(index, { looking: event.target.checked })} />
            {tx("Looking to work here")}
          </label>
          <button type="button" className={btnOutline} aria-label={tx("Remove")} onClick={() => onChange(rows.filter((_, item) => item !== index))}>×</button>
          {row.licensed ? (
            <input className={`${field} sm:col-span-3`} placeholder={tx(numberLabel)} value={row.licenseNumber} onChange={(event) => update(index, { licenseNumber: event.target.value })} />
          ) : null}
        </div>
      ))}
      <button
        type="button"
        className={btnOutline}
        disabled={rows.length >= 5}
        onClick={() => onChange([...rows, { state: "", licensed: false, looking: false, licenseNumber: "" }])}
      >
        {tx("+ Add another state")}
      </button>
      <span className="ml-2 text-xs text-mut">{tx("{count} of 5").replace("{count}", String(rows.length))}</span>
    </div>
  );
}

function ProjectList({
  required,
  projects,
  onChange,
}: {
  required: number;
  projects: JoinProject[];
  onChange: (projects: JoinProject[]) => void;
}) {
  const count = Math.max(required, projects.length, required ? required : 1);
  const rows = Array.from({ length: Math.min(3, count) }, (_, index) => projects[index] || { name: "", location: "", role: "", llc: "", link: "" });
  const tx = useTx();
  function update(index: number, partial: Partial<JoinProject>) {
    const next = rows.slice();
    next[index] = { ...rows[index], ...partial };
    onChange(next);
  }
  return (
    <div className="mt-3 space-y-3">
      {rows.map((project, index) => (
        <div key={index} className="rounded border border-line bg-paper p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brass">{tx("Project {n}").replace("{n}", String(index + 1))} · {index < required ? tx("required") : tx("optional")}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Field label="Project name" required={index < required} value={project.name} onChange={(value) => update(index, { name: value })} />
            <Field label="Project city / location" required={index < required} value={project.location} onChange={(value) => update(index, { location: value })} />
            <Field label="Your role" required={index < required} value={project.role} onChange={(value) => update(index, { role: value })} />
            <Field label="Project LLC name" optional value={project.llc} onChange={(value) => update(index, { llc: value })} />
            <label className="sm:col-span-2">
              <span className={labelCls}>{tx("Link or photo (optional)")}</span>
              <input className={field} value={project.link} onChange={(event) => update(index, { link: event.target.value })} />
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

function DeveloperFields({ profile, onChange }: { profile: JoinProfile; onChange: (partial: Partial<JoinProfile>) => void }) {
  const dev = profile.developing;
  const tx = useTx();
  return (
    <div className="mt-3 border-t border-line pt-3">
      <h3 className="font-serif text-xl font-normal">{tx("Project you're looking to develop (if you have one) (optional)")}</h3>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={dev.notYet} onChange={(event) => onChange({ developing: { ...dev, notYet: event.target.checked } })} />
        {tx("Not yet, just building my team")}
      </label>
      <div className={`mt-3 grid gap-2 sm:grid-cols-2 ${dev.notYet ? "opacity-40" : ""}`}>
        <SelectField label="Project type" optional value={dev.type} options={JOIN_PROPERTY_TYPES} onChange={(type) => onChange({ developing: { ...dev, type } })} />
        <Field label="Location (city / state)" optional value={dev.location} onChange={(location) => onChange({ developing: { ...dev, location } })} />
        <Field label="Size (units or SF)" optional value={dev.size} onChange={(size) => onChange({ developing: { ...dev, size } })} />
        <SelectField label="Stage" optional value={dev.stage} options={["Land / site search", "Under contract", "Entitlement", "Design", "Pre-construction", "Financing", "Under construction"]} onChange={(stage) => onChange({ developing: { ...dev, stage } })} />
        <SelectField label="Estimated budget range" optional value={dev.budget} options={DEAL_SIZES} onChange={(budget) => onChange({ developing: { ...dev, budget } })} />
        <SelectField label="Timeline" optional value={dev.timeline} options={["Next 6 months", "6–12 months", "1–2 years", "2+ years"]} onChange={(timeline) => onChange({ developing: { ...dev, timeline } })} />
      </div>
    </div>
  );
}

export function ReferralCodePage() {
  const [code, setCode] = useState("");
  const tx = useTx();
  return (
    <div className="mx-auto w-full max-w-lg overflow-x-hidden px-4 py-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">{tx("Private Floor Club · Membership")}</p>
      <h1 className="mt-2 font-serif text-4xl font-normal text-forest">{tx("Referral code")}</h1>
      <p className="mt-2 text-sm text-ink">{tx("A code is optional. Enter one if a member gave it to you, then continue to the request.")}</p>
      <form action="/join" className="mt-6 rounded border border-line border-t-[3px] border-t-brass bg-cream p-4 sm:p-8">
        <label>
          <span className={labelCls}>{tx("Referral code (optional)")}</span>
          <input name="code" className={field} value={code} onChange={(event) => setCode(event.target.value)} placeholder={tx("e.g. PF-1234")} />
        </label>
        <button className={`${btn} mt-4 w-full sm:w-auto`} type="submit">{tx("Continue")}</button>
      </form>
      <p className="mt-4 text-sm">
        <Link href="/join" className="underline decoration-brass">{tx("Continue without a code")}</Link>
      </p>
    </div>
  );
}
