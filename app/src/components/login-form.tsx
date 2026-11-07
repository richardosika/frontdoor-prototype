"use client";

import { SubmitButton } from "@/components/submit-button";

import { useRef, useState } from "react";
import { adminLoginAction, loginAction } from "@/actions/auth";
import { SIGN_IN_FALLBACK_PATH } from "@/lib/sign-in-fallback";
import { btn, field, labelCls } from "@/components/ui";
import { useTx } from "@/components/locale-context";

export function LoginForm({ next, portal = "member", initialError = "" }: { next?: string; portal?: "member" | "admin"; initialError?: string }) {
  const [error, setError] = useState(initialError);
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  // React clears a form after its action runs; keep the email so an error does not wipe what the member typed.
  const [email, setEmail] = useState("");
  const tx = useTx();

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError("");
    let result: { error: string } | void;
    try {
      result = portal === "admin" ? await adminLoginAction(formData) : await loginAction(formData);
    } catch (thrown) {
      // Redirects after a good sign-in are Next.js control flow: let them through.
      if (thrown && typeof thrown === "object" && "digest" in thrown && String((thrown as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) throw thrown;
      // The page is from an older build (site updated while it was open) or the call failed: post the same form the
      // plain way instead of reloading to an empty page. Fields are still filled in, so nothing has to be retyped.
      const form = formRef.current;
      if (form) {
        form.action = SIGN_IN_FALLBACK_PATH;
        form.method = "post";
        HTMLFormElement.prototype.submit.call(form);
        return;
      }
      setError("Something went wrong loading this page.");
      setPending(false);
      return;
    }
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      {portal === "member" ? <input type="hidden" name="next" value={next || "/feed"} /> : null}
      <input type="hidden" name="portal" value={portal} />
      {error ? <p className="text-sm text-brass">{tx(error)}</p> : null}
      <div>
        <label className={labelCls}>{tx("Email")}</label>
        {/* Plain text, not type=email: iPhone blocked the tap with its own "Enter an email address" bubble, so a tester who
            typed the gate username never saw our explanation (Nov 6, Julia). The server checks the address instead. */}
        <input className={field} name="email" type="text" value={email} onChange={(event) => setEmail(event.target.value)} inputMode="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required placeholder="you@firm.com" />
      </div>
      <div>
        <label className={labelCls}>{tx("Password")}</label>
        <input className={field} name="password" type="password" autoComplete="current-password" required />
      </div>
      <SubmitButton className={`${btn} w-full`} disabled={pending} pendingLabel="Signing in…">
        {tx("Sign in")}
      </SubmitButton>
    </form>
  );
}
