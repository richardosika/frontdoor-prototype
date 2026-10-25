"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { checkInvite, confirmApplicationCode, sendApplicationCode, submitApplication } from "@/actions/apply";
import { AdminEntryLink } from "@/components/admin-mark";
import { btn, btnOutline, field, labelCls } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { duesForRole } from "@/lib/dues";
import { GROUPS, ROLES } from "@/lib/roles";
import type { RoleId } from "@/lib/roles";

const STEPS = [
  { id: 1, label: "Invite code" },
  { id: 2, label: "Choose role" },
  { id: 3, label: "Your details" },
  { id: 4, label: "Terms" },
  { id: 5, label: "Membership dues" },
] as const;

const LEGAL_LINKS = [
  ["/legal/terms", "Terms of Use"],
  ["/legal/privacy", "Privacy Policy"],
  ["/legal/disclosures", "Important Disclosures"],
  ["/legal/verification-policy", "Verification Policy"],
  ["/legal/applicant-consent", "Applicant consent"],
  ["/legal/guidelines", "Community guidelines"],
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [password, setPassword] = useState("");
  const [org, setOrg] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [socialLinks, setSocialLinks] = useState("");
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [cardPreview, setCardPreview] = useState("");
  const [referenceEmail, setReferenceEmail] = useState("");
  const [referenceEmail2, setReferenceEmail2] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [statement, setStatement] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptVerification, setAcceptVerification] = useState(false);

  const selected = ROLES.find((item) => item.id === role) ?? ROLES[0];
  const dues = duesForRole(role);

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
    const result = await checkInvite(code);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStep(2);
  }

  async function sendCode() {
    setPending(true);
    setError("");
    const result = await sendApplicationCode(email);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCodeSent(true);
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
    if (name.trim().length < 2 || !email.trim() || password.length < 8 || org.trim().length < 2 || location.trim().length < 2) {
      setError("Enter your name, email, a password of at least 8 characters, company, and city.");
      return;
    }
    if (verifiedEmail !== email.trim().toLowerCase()) {
      setError("Confirm the email code before you continue.");
      return;
    }
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
    data.set("name", name);
    data.set("email", email);
    data.set("password", password);
    data.set("org", org);
    data.set("location", location);
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
      <div className="safe-top flex items-center justify-between bg-forest px-5 pb-4 text-paper md:py-4">
        <span className="font-serif text-lg tracking-[0.18em] uppercase">Apply</span>
        <span className="text-xs text-sand">{done ? "Submitted" : `Step ${step} of ${STEPS.length}`}</span>
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
            <h1 className="font-serif text-2xl">Application under review</h1>
            <p className="mt-2 text-sm text-ink">
              A Private Floor administrator reviews every application. Verification is in progress. Nothing was charged. Keep the status link. Messages about this application stay on that page.
            </p>
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
            <h1 className="font-serif text-xl">Invite code</h1>
            <p className="mt-1 text-sm text-ink">
              {BRAND.club} is nationwide and invite-only. Enter the code a member shared with you, or request one.
            </p>
            <label className={`${labelCls} mt-4`}>Invite code</label>
            <input className={field} value={code} onChange={(event) => setCode(event.target.value)} placeholder="PF-XXXX-XXXX" />
            <button className={`${btn} mt-4 w-full`} type="button" disabled={pending} onClick={nextFromCode}>
              Continue
            </button>
            <Link href="/" className={`${btnOutline} mt-2 w-full`}>
              Request an invite
            </Link>
          </div>
        ) : null}
        {!done && step === 2 ? (
          <div>
            <h1 className="font-serif text-xl">Choose role</h1>
            <p className="mt-1 text-sm text-ink">Pick the role that best describes you. Dues, if any, are shown on the last step and are paid after approval.</p>
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
          <div className="space-y-3">
            <h1 className="font-serif text-xl">Your details</h1>
            <p className="text-sm text-ink">
              Name, email, password, company, and city. A business card is optional and encouraged. References are optional. Other members never see the card, your email, your phone, or your LinkedIn URL.
            </p>
            <div>
              <label className={labelCls}>Name</label>
              <input className={field} value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                className={field}
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setVerifiedEmail("");
                }}
              />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input className={field} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Company</label>
              <input className={field} value={org} onChange={(event) => setOrg(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>City and state</label>
              <input className={field} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Newark, NJ" />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={field} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className={labelCls}>LinkedIn URL</label>
              <input className={field} value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} placeholder="https://" />
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input className={field} value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://" />
            </div>
            <div>
              <label className={labelCls}>Other social links (optional)</label>
              <textarea className={field} rows={2} value={socialLinks} onChange={(event) => setSocialLinks(event.target.value)} placeholder="One https link per line" />
            </div>
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
            <div>
              <label className={labelCls}>Reference email (optional)</label>
              <input className={field} type="email" value={referenceEmail} onChange={(event) => setReferenceEmail(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Second reference email (optional)</label>
              <input className={field} type="email" value={referenceEmail2} onChange={(event) => setReferenceEmail2(event.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Tell us about you / your track record</label>
              <textarea className={field} rows={4} value={statement} onChange={(event) => setStatement(event.target.value)} />
            </div>
            <div className="rounded border border-line bg-cream p-3">
              <p className="text-sm font-semibold">Confirm your email</p>
              <p className="mt-1 text-sm text-ink">
                A 6-digit code proves this inbox is yours. During this test the code is delivered only to the test recipient and is listed in the admin Outbox. It is not sent to the address you typed.
              </p>
              {verifiedEmail && verifiedEmail === email.trim().toLowerCase() ? (
                <p className="mt-2 text-sm text-forest">Email confirmed.</p>
              ) : (
                <>
                  <button className={`${btnOutline} mt-3 w-full`} type="button" disabled={pending || !email.trim()} onClick={sendCode}>
                    {codeSent ? "Send a new code" : "Send code"}
                  </button>
                  {codeSent ? (
                    <>
                      <label className={`${labelCls} mt-3`}>6-digit code</label>
                      <input className={field} inputMode="numeric" value={emailCode} onChange={(event) => setEmailCode(event.target.value)} placeholder="000000" />
                      <button className={`${btn} mt-3 w-full`} type="button" disabled={pending} onClick={confirmCode}>
                        Confirm code
                      </button>
                    </>
                  ) : null}
                </>
              )}
            </div>
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
          <div>
            <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: consent.beforeHtml }} />
            <ul className="mt-4 space-y-2 text-sm">
              {LEGAL_LINKS.map(([href, label]) => (
                <li key={href}>
                  <Link className="underline decoration-brass" href={href} target="_blank">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <ConsentBoxes
              consent={consent}
              acceptTerms={acceptTerms}
              acceptVerification={acceptVerification}
              onTerms={setAcceptTerms}
              onVerification={setAcceptVerification}
            />
            <div className="mt-4 flex gap-2">
              <button className={`${btnOutline} flex-1`} type="button" onClick={() => setStep(3)}>
                Back
              </button>
              <button className={`${btn} flex-1`} type="button" disabled={!acceptTerms || !acceptVerification} onClick={() => setStep(5)}>
                Continue
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink">{consent.helper}</p>
          </div>
        ) : null}
        {!done && step === 5 ? (
          <div>
            <h1 className="font-serif text-xl">Membership dues</h1>
            <p className="mt-1 text-sm text-ink">{selected.label}</p>
            <div className="mt-4 rounded border border-brass bg-brass-soft p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">Annual dues</p>
              <p className="mt-1 font-serif text-3xl">{dues.label}</p>
            </div>
            <p className="mt-3 text-sm text-ink">
              {dues.cents > 0
                ? "No card is collected on this form. After approval, this flat annual amount is due. It is never based on a deal."
                : "This role has no annual dues. Approval opens the floor. Nothing is charged."}
            </p>
            <ConsentBoxes
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
            <div className="mt-4 flex gap-2">
              <button className={`${btnOutline} flex-1`} type="button" onClick={() => setStep(4)} disabled={pending}>
                Back
              </button>
              <button
                className={`${btn} flex-1`}
                type="button"
                disabled={pending || !acceptTerms || !acceptVerification}
                aria-busy={pending}
                onClick={submit}
              >
                {pending ? "Submitting…" : "Submit application"}
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink">{consent.helper}</p>
          </div>
        ) : null}
      </div>
      <p className="px-5 pb-5">
        <AdminEntryLink />
      </p>
    </div>
  );
}

function ConsentBoxes({
  consent,
  acceptTerms,
  acceptVerification,
  onTerms,
  onVerification,
}: {
  consent: ApplyConsentCopy;
  acceptTerms: boolean;
  acceptVerification: boolean;
  onTerms: (value: boolean) => void;
  onVerification: (value: boolean) => void;
}) {
  return (
    <div className="mt-4 space-y-3">
      <label className="flex items-start gap-2 text-sm leading-relaxed">
        <input className="mt-1 shrink-0" type="checkbox" checked={acceptTerms} onChange={(event) => onTerms(event.target.checked)} />
        <span>{consent.termsLabel}</span>
      </label>
      <label className="flex items-start gap-2 text-sm leading-relaxed">
        <input
          className="mt-1 shrink-0"
          type="checkbox"
          checked={acceptVerification}
          onChange={(event) => onVerification(event.target.checked)}
        />
        <span>{consent.verificationLabel}</span>
      </label>
    </div>
  );
}
