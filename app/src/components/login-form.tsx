"use client";

import { SubmitButton } from "@/components/submit-button";

import { useState } from "react";
import { adminLoginAction, loginAction } from "@/actions/auth";
import { btn, field, labelCls } from "@/components/ui";
import { useTx } from "@/components/locale-context";

export function LoginForm({ next, portal = "member" }: { next?: string; portal?: "member" | "admin" }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const tx = useTx();

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError("");
    const result = portal === "admin" ? await adminLoginAction(formData) : await loginAction(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="space-y-3">
      {portal === "member" ? <input type="hidden" name="next" value={next || "/feed"} /> : null}
      {error ? <p className="text-sm text-brass">{tx(error)}</p> : null}
      <div>
        <label className={labelCls}>{tx("Email")}</label>
        <input className={field} name="email" type="email" autoComplete="username" required placeholder="you@firm.com" />
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
