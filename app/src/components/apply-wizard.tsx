"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { checkInvite, confirmApplicationCode, sendApplicationCode, submitApplication } from "@/actions/apply";
import { AdminEntryLink } from "@/components/admin-mark";
import { JoinLanguages } from "@/components/join-languages";
import { AgreementBoxes, BeforeSubmit, StepIntro } from "@/components/apply-before-submit";
import { btn, btnOutline, field, labelCls } from "@/components/ui";
import { applyDetailsIssues, DETAILS_CONTINUE_MESSAGE, stillNeeded, type ApplyDetailsIssue } from "@/lib/apply-details";
import { applicationReceivedMessage, APPLY_ENCOURAGEMENT } from "@/lib/applicant-copy";
import { BRAND } from "@/lib/brand";
import { MEMBERSHIP_PHRASE } from "@/lib/membership-copy";
import { DuesLanguages } from "@/components/dues-languages";
import { DUES_BILLING_NOTE, DUES_FREE_LINE, DUES_SCHEDULE_SENTENCE, duesForRole, formatMoney } from "@/lib/dues";
import { GROUPS, ROLES } from "@/lib/roles";
import type { RoleId } from "@/lib/roles";

const STEPS = [
  { id: 1, label: "Referral code" },
  { id: 2, label: "Choose role" },
  { id: 3, label: "Your details" },
  { id: 4, label: "Terms" },
  { id: 5, label: "Membership dues" },
] as const;

export type ApplyConsentCopy = {
  beforeHtml: string;
  termsLabel: string;
  verificationLabel: string;
  helper: string;
};

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ApplyWizard({ consent }: { consent: ApplyConsentCopy }) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [statusToken, setStatusToken] = useState("");
  const [code, setCode] = useState("");
  const [role, setRole] = useState<RoleId>("DEVELOPER");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [testHint, setTestHint] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [org, setOrg] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [zip, setZip] = useState("");
  const [website, setWebsite] = useState("");
  const [socialLinks, setSocialLinks] = useState("");
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [cardPreview, setCardPreview] = useState("");
  const [referenceEmail, setReferenceEmail] = useState("");
  const [referenceEmail2, setReferenceEmail2] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [statement, setStatement] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [continueNote, setContinueNote] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptVerification, setAcceptVerification] = useState(false);

  const selected = ROLES.find((item) => item.id === role) ?? ROLES[0];
  const dues = duesForRole(role);
  const detailValues = {
    firstName,
    lastName,
    email,
    password,
    org,
    street,
    city,
    state: stateName,
    zip,
    phone,
    linkedinUrl,
    website,
    socialLinks,
    referenceEmail,
    referenceEmail2,
    statement,
  };
  const detailIssues = applyDetailsIssues(detailValues);
  const issueById = new Map(detailIssues.map((issue) => [issue.id, issue]));
  const emailMatches = verifiedEmail !== "" && verifiedEmail === email.trim().toLowerCase();
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const holdConfirmation = verifiedEmail !== "" && (emailMatches || !emailLooksValid);

  useEffect(() => {
    if (!error) return;
    document.getElementById("apply-error")?.scrollIntoView({ block: "center" });
  }, [error]);

  function onCard(file: File | undefined) {
    setCardFile(file ?? null);
    setCardPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      if (file && file.type.startsWith("image/")) return URL.createObjectURL(file);
      return "";
    });
  }

  async function nextFromCode() {
    setPending(true);
    setError("");
    if (!code.trim()) {
      setPending(false);
      setStep(2);
      return;
    }
    const result = await checkInvite(code);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStep(2);
  }

  function reveal(id: string) {
    setTouched((current) => (current[id] ? current : { ...current, [id]: true }));
  }

  function visibleError(id: string): string {
    if (!showAllIssues && !touched[id]) return "";
    return issueById.get(id)?.message ?? "";
  }

  function editField(id: string, apply: () => void) {
    if (!issueById.has(id)) reveal(id);
    apply();
  }

  function focusDetail(id: string) {
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ block: "center" });
      if (el instanceof HTMLElement) el.focus();
    });
  }

  async function sendCode() {
    if (detailIssues.length) {
      setShowAllIssues(true);
      setContinueNote(DETAILS_CONTINUE_MESSAGE);
      const first = detailIssues[0];
      if (first) focusDetail(first.id);
      return;
    }
    setPending(true);
    setError("");
    const result = await sendApplicationCode(email);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCodeSent(true);
    setTestHint(result.testHint);
    setVerifiedEmail("");
  }

  async function confirmCode() {
    setPending(true);
    setError("");
    const result = await confirmApplicationCode(email, emailCode);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setVerifiedEmail(email.trim().toLowerCase());
  }

  function continueFromDetails() {
    if (detailIssues.length) {
      setShowAllIssues(true);
      setContinueNote(DETAILS_CONTINUE_MESSAGE);
      const first = detailIssues[0];
      if (first) focusDetail(first.id);
      return;
    }
    if (!emailMatches) {
      setContinueNote("Confirm the email code before you continue.");
      focusDetail("confirm-email");
      return;
    }
    setContinueNote("");
    setError("");
    setStep(4);
  }

  async function submit() {
    if (verifiedEmail !== email.trim().toLowerCase()) {
      setError("Verify the email code before you submit.");
      setStep(3);
      return;
    }
    if (!acceptTerms || !acceptVerification) {
      setError("Check both boxes before you submit.");
      setStep(4);
      return;
    }
    setPending(true);
    setError("");
    const data = new FormData();
    data.set("code", code);
    data.set("role", role);
    data.set("firstName", firstName);
    data.set("lastName", lastName);
    data.set("email", email);
    data.set("password", password);
    data.set("org", org);
    data.set("street", street);
    data.set("city", city);
    data.set("state", stateName);
    data.set("zip", zip);
    data.set("website", website);
    data.set("socialLinks", socialLinks);
    data.set("referenceEmail", referenceEmail);
    data.set("referenceEmail2", referenceEmail2);
    data.set("phone", phone);
    data.set("linkedinUrl", linkedinUrl);
    data.set("statement", statement);
    data.set("accept_terms", acceptTerms ? "yes" : "");
    data.set("accept_verification", acceptVerification ? "yes" : "");
    if (cardFile) data.set("businessCard", cardFile);
    const result = await submitApplication(data);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStatusToken(result.statusToken);
    setDone(true);
  }

  return (
    <div className="safe-bottom mx-auto min-h-dvh w-full max-w-[560px] overflow-hidden bg-paper md:min-h-0 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
      <div className="safe-top bg-forest px-5 pb-4 text-paper md:py-4">
        <div className="flex items-center justify-between">
          <span className="font-serif text-lg tracking-[0.18em] uppercase">Apply</span>
          <span className="text-xs text-sand">{done ? "Submitted" : `Step ${step} of ${STEPS.length}`}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-sand">{APPLY_ENCOURAGEMENT}</p>
      </div>
      <ol className="grid grid-cols-3 gap-2 px-5 pt-4 sm:grid-cols-5">
        {STEPS.map((item) => (
          <li key={item.id} className="min-w-0">
            <i className={`mb-1 block h-1 rounded ${!done && item.id <= step ? "bg-brass" : done ? "bg-brass" : "bg-line"}`} />
            <span className={`block truncate text-[10px] uppercase tracking-wide ${item.id === step && !done ? "text-forest" : "text-mut"}`}>
              {item.label}
            </span>
          </li>
        ))}
      </ol>
      <div className="px-5 py-5">
        {error ? (
          <p id="apply-error" className="mb-3 text-sm text-brass">
            {error}
          </p>
        ) : null}
        {done ? (
          <div className="py-4">
            <h1 className="font-serif text-2xl">Application received</h1>
            <p className="mt-2 text-sm text-ink">{applicationReceivedMessage(firstName)}</p>
            <p className="mt-2 text-sm text-ink">Nothing was charged. Keep the status link. Messages about this application stay on that page.</p>
            {statusToken ? (
              <Link href={`/apply/status/${statusToken}`} className={`${btn} mt-4 w-full`}>
                View application status
              </Link>
            ) : null}
            <Link href="/login" className={`${btnOutline} mt-2 w-full`}>
              Back to sign in
            </Link>
          </div>
        ) : null}
        {!done && step === 1 ? (
          <div>
            <StepIntro title="Referral code">
              <p>{MEMBERSHIP_PHRASE}. A referral code from a member is optional. Leave it blank to continue.</p>
            </StepIntro>
            <JoinLanguages />
            <label className={labelCls}>Referral code, optional</label>
            <input className={field} value={code} onChange={(event) => setCode(event.target.value)} placeholder="Optional" />
            <button className={`${btn} mt-4 w-full`} type="button" disabled={pending} onClick={nextFromCode}>
              Continue
            </button>
            <Link href="/#request-to-join" className={`${btnOutline} mt-2 w-full`}>
              Request to join
            </Link>
          </div>
        ) : null}
        {!done && step === 2 ? (
          <div>
            <StepIntro title="Choose role">
              <p>Pick the role that best describes you. Each card shows the monthly dues for that role, with the half-price first month next to the full price.</p>
            </StepIntro>
            <div className="mb-4 rounded border border-line bg-cream px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Membership dues</p>
              <p className="mt-2 text-sm leading-relaxed text-ink">{DUES_SCHEDULE_SENTENCE}</p>
            </div>
            <div className="mt-3 max-h-[420px] overflow-y-auto pr-1">
              {GROUPS.map((group) => (
                <div key={group}>
                  <div className="mb-1.5 mt-3 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-mut">{group}</div>
                  {ROLES.filter((item) => item.group === group).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRole(item.id)}
                      className={`mb-2 flex w-full items-center gap-2.5 rounded border px-3 py-2.5 text-left text-sm ${
                        role === item.id ? "border-brass bg-brass-soft" : "border-line bg-paper"
                      }`}
                    >
                      <i
                        className={`h-4 w-4 shrink-0 rounded-full border ${
                          role === item.id ? "border-brass bg-brass shadow-[inset_0_0_0_3px_#FFFDF8]" : "border-line"
                        }`}
                      />
                      <span>
                        {item.label}
                        <small className="block text-[11px] text-mut">{item.blurb}</small>
                        <small className="mt-0.5 block text-[11px] font-semibold tracking-wide text-brass">
                          {duesForRole(item.id).label}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button className={`${btnOutline} flex-1`} type="button" onClick={() => setStep(1)}>
                Back
              </button>
              <button className={`${btn} flex-1`} type="button" onClick={() => setStep(3)}>
                Continue
              </button>
            </div>
          </div>
        ) : null}
        {!done && step === 3 ? (
          <div className="space-y-4">
            <StepIntro title="Your details">
              <p className="text-sm text-ink">
              First and last name, email, a password of at least 8 characters, company, contact phone, and full address. A business card is optional. References are optional. Other members never see the card, your email, your phone, or your LinkedIn URL.
              </p>
            </StepIntro>
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailControl id="apply-first-name" label="First name" value={firstName} error={visibleError("apply-first-name")} autoComplete="given-name" onBlur={() => reveal("apply-first-name")} onChange={(value) => editField("apply-first-name", () => setFirstName(value))} />
              <DetailControl id="apply-last-name" label="Last name" value={lastName} error={visibleError("apply-last-name")} autoComplete="family-name" onBlur={() => reveal("apply-last-name")} onChange={(value) => editField("apply-last-name", () => setLastName(value))} />
            </div>
            <DetailControl
              id="apply-email"
              label="Email"
              type="email"
              value={email}
              error={visibleError("apply-email")}
              autoComplete="email"
              onBlur={() => reveal("apply-email")}
              onChange={(value) =>
                editField("apply-email", () => {
                  setEmail(value);
                  const next = value.trim().toLowerCase();
                  if (verifiedEmail && next !== verifiedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
                    setCodeSent(false);
                    setEmailCode("");
                    setTestHint(null);
                  }
                })
              }
            />
            <DetailControl id="apply-password" label="Create password" hint="Minimum 8 characters" type="password" value={password} error={visibleError("apply-password")} autoComplete="new-password" onBlur={() => reveal("apply-password")} onChange={(value) => editField("apply-password", () => setPassword(value))} />
            <DetailControl id="apply-company" label="Company" value={org} error={visibleError("apply-company")} autoComplete="organization" onBlur={() => reveal("apply-company")} onChange={(value) => editField("apply-company", () => setOrg(value))} />
            <DetailControl id="apply-street" label="Street" value={street} error={visibleError("apply-street")} autoComplete="address-line1" onBlur={() => reveal("apply-street")} onChange={(value) => editField("apply-street", () => setStreet(value))} />
            <div className="grid gap-3 sm:grid-cols-3">
              <DetailControl id="apply-city" label="City" value={city} error={visibleError("apply-city")} autoComplete="address-level2" onBlur={() => reveal("apply-city")} onChange={(value) => editField("apply-city", () => setCity(value))} />
              <DetailControl id="apply-state" label="State" value={stateName} error={visibleError("apply-state")} autoComplete="address-level1" maxLength={2} placeholder="NJ" onBlur={() => reveal("apply-state")} onChange={(value) => editField("apply-state", () => setStateName(value))} />
              <DetailControl id="apply-zip" label="ZIP" value={zip} error={visibleError("apply-zip")} autoComplete="postal-code" inputMode="numeric" placeholder="07663" onBlur={() => reveal("apply-zip")} onChange={(value) => editField("apply-zip", () => setZip(value))} />
            </div>
            <DetailControl id="apply-phone" label="Contact phone" value={phone} error={visibleError("apply-phone")} autoComplete="tel" onBlur={() => reveal("apply-phone")} onChange={(value) => editField("apply-phone", () => setPhone(value))} />
            <DetailControl id="apply-linkedin" label="LinkedIn URL" value={linkedinUrl} error={visibleError("apply-linkedin")} placeholder="https://" onBlur={() => reveal("apply-linkedin")} onChange={(value) => editField("apply-linkedin", () => setLinkedinUrl(value))} />
            <DetailControl id="apply-website" label="Website" value={website} error={visibleError("apply-website")} placeholder="https://" onBlur={() => reveal("apply-website")} onChange={(value) => editField("apply-website", () => setWebsite(value))} />
            <DetailControl id="apply-social" label="Other social links (optional)" value={socialLinks} error={visibleError("apply-social")} rows={2} placeholder="One https link per line" onBlur={() => reveal("apply-social")} onChange={(value) => editField("apply-social", () => setSocialLinks(value))} />
            <div>
              <label className={labelCls}>Business card (optional, encouraged)</label>
              <input
                className={field}
                type="file"
                accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
                onChange={(event) => onCard(event.target.files?.[0])}
              />
              {cardFile ? (
                <div className="mt-2 rounded border border-line bg-cream p-3 text-xs text-ink">
                  <p>
                    <b>{cardFile.name}</b>
                  </p>
                  <p>
                    {cardFile.type || "unknown type"} · {fileSize(cardFile.size)}
                  </p>
                  {cardPreview ? (
                    // Local preview of a file the applicant just chose.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cardPreview} alt="Business card preview" className="mt-2 max-h-40 rounded border border-line" />
                  ) : null}
                  {cardFile.type === "application/pdf" ? <p className="mt-1">PDF selected. A preview is not shown here.</p> : null}
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-mut">JPG, PNG, or PDF, up to 5 MB. Other members never see the file.</p>
              )}
            </div>
            <DetailControl id="apply-reference-1" label="Reference email (optional)" type="email" value={referenceEmail} error={visibleError("apply-reference-1")} onBlur={() => reveal("apply-reference-1")} onChange={(value) => editField("apply-reference-1", () => setReferenceEmail(value))} />
            <DetailControl id="apply-reference-2" label="Second reference email (optional)" type="email" value={referenceEmail2} error={visibleError("apply-reference-2")} onBlur={() => reveal("apply-reference-2")} onChange={(value) => editField("apply-reference-2", () => setReferenceEmail2(value))} />
            <DetailControl id="apply-statement" label="Tell us about you / your track record" value={statement} error={visibleError("apply-statement")} rows={4} onBlur={() => reveal("apply-statement")} onChange={(value) => editField("apply-statement", () => setStatement(value))} />
            <div id="confirm-email" tabIndex={-1} className="rounded border border-line bg-cream p-3 outline-none">
              <p className="text-sm font-semibold">Confirm your email</p>
              <p className="mt-1 text-sm text-ink">
                A 4-digit code proves this inbox is yours. It is recorded in the admin Outbox. When no email provider is configured, the code also appears here and is labelled test mode.
              </p>
              {holdConfirmation ? (
                <>
                  <p className="mt-2 text-sm text-forest">Email confirmed.</p>
                  <StillNeeded issues={detailIssues} />
                </>
              ) : (
                <>
                  <StillNeeded issues={detailIssues} />
                  <button
                    className={`${btnOutline} mt-3 w-full`}
                    type="button"
                    disabled={pending || detailIssues.length > 0}
                    aria-describedby={detailIssues.length ? "apply-still-needed" : undefined}
                    onClick={sendCode}
                  >
                    {codeSent ? "Send a new code" : "Send code"}
                  </button>
                  {detailIssues.length === 0 && codeSent ? (
                    <>
                      {testHint ? (
                        <p className="mt-3 rounded border border-brass bg-brass-soft p-3 text-sm text-ink" role="status">
                          {testHint}
                        </p>
                      ) : null}
                      <label className={`${labelCls} mt-3`} htmlFor="apply-email-code">
                        4-digit code
                      </label>
                      <input id="apply-email-code" className={field} inputMode="numeric" maxLength={4} value={emailCode} onChange={(event) => setEmailCode(event.target.value)} placeholder="0000" />
                      <button className={`${btn} mt-3 w-full`} type="button" disabled={pending} onClick={confirmCode}>
                        Confirm code
                      </button>
                    </>
                  ) : null}
                </>
              )}
            </div>
            {continueNote ? (
              <p id="apply-continue-note" role="alert" className="text-sm font-semibold text-brass">
                {continueNote}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button className={`${btnOutline} flex-1`} type="button" onClick={() => setStep(2)}>
                Back
              </button>
              <button className={`${btn} flex-1`} type="button" onClick={continueFromDetails}>
                Continue
              </button>
            </div>
          </div>
        ) : null}
        {!done && step === 4 ? (
          <BeforeSubmit
            consent={consent}
            acceptTerms={acceptTerms}
            acceptVerification={acceptVerification}
            onTerms={setAcceptTerms}
            onVerification={setAcceptVerification}
            onBack={() => setStep(3)}
            onContinue={() => setStep(5)}
          />
        ) : null}
        {!done && step === 5 ? (
          <div>
            <StepIntro title="Membership dues">
              <p>{selected.label}</p>
            </StepIntro>
            <div className="rounded border border-brass bg-brass-soft p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">Membership dues</p>
              {dues.cents > 0 ? (
                <>
                  <p className="mt-1 font-serif text-3xl">{formatMoney(dues.firstCents)}</p>
                  <p className="mt-2 text-sm text-ink">First month, 50% off. Then {formatMoney(dues.cents)} per month.</p>
                </>
              ) : (
                <p className="mt-1 font-serif text-3xl">{dues.label}</p>
              )}
              <p className="mt-2 text-sm leading-relaxed text-ink">
                {dues.cents > 0
                  ? `${DUES_BILLING_NOTE} No card is collected on this form. The next charge is one month after the first month is recorded. A reminder goes out before that full-price charge.`
                  : `${DUES_FREE_LINE} Approval opens the floor. Nothing is charged.`}
              </p>
              {dues.cents > 0 ? <DuesLanguages /> : null}
            </div>
            <section className="mt-5 rounded border border-brass bg-paper px-4 py-5">
              <h2 className="font-serif text-xl font-normal">Your agreement</h2>
              <AgreementBoxes
                consent={consent}
                acceptTerms={acceptTerms}
                acceptVerification={acceptVerification}
                onTerms={setAcceptTerms}
                onVerification={setAcceptVerification}
              />
              {pending ? (
                <p role="status" className="mt-3 text-sm font-semibold text-forest">
                  Submitting your application…
                </p>
              ) : null}
              <button
                className={`${btn} mt-5 w-full`}
                type="button"
                disabled={pending || !acceptTerms || !acceptVerification}
                aria-busy={pending}
                onClick={submit}
              >
                {pending ? "Submitting…" : "Submit application"}
              </button>
              <button className={`${btnOutline} mt-2 w-full`} type="button" onClick={() => setStep(4)} disabled={pending}>
                Back
              </button>
              <p className="mt-3 text-xs leading-relaxed text-ink">{consent.helper}</p>
            </section>
          </div>
        ) : null}
      </div>
      <p className="px-5 pb-5">
        <AdminEntryLink />
      </p>
    </div>
  );
}

function StillNeeded({ issues }: { issues: ApplyDetailsIssue[] }) {
  if (!issues.length) return null;
  return (
    <p id="apply-still-needed" className="mt-2 text-sm text-brass" role="status">
      {stillNeeded(issues)}
    </p>
  );
}

function DetailControl({
  id,
  label,
  value,
  error,
  onChange,
  onBlur,
  type = "text",
  autoComplete,
  inputMode,
  hint,
  placeholder,
  maxLength,
  rows,
}: {
  id: string;
  label: string;
  value: string;
  error: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "email" | "text" | "tel";
  hint?: string;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}) {
  const className = `${field} ${error ? "border-brass ring-1 ring-brass" : ""}`;
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label className={labelCls} htmlFor={id}>
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="mb-1.5 text-xs text-mut">
          {hint}
        </p>
      ) : null}
      {rows ? (
        <textarea
          id={id}
          className={className}
          rows={rows}
          value={value}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          className={className}
          type={type}
          value={value}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-brass">
          {error}
        </p>
      ) : null}
    </div>
  );
}
