"use client";

import { useState } from "react";
import { loginAction } from "@/actions/auth";
import { btn, field, labelCls } from "@/components/ui";

export function LoginForm({ next }: { next?: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError("");
    const result = await loginAction(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <input type="hidden" name="next" value={next || "/feed"} />
      {error ? <p className="text-sm text-terra">{error}</p> : null}
      <div>
        <label className={labelCls}>Email</label>
        <input className={field} name="email" type="email" autoComplete="username" required placeholder="marcus.hale@halerow.example" />
      </div>
      <div>
        <label className={labelCls}>Password</label>
        <input className={field} name="password" type="password" autoComplete="current-password" required />
      </div>
      <button className={`${btn} w-full`} disabled={pending} type="submit">
        Sign in
      </button>
    </form>
  );
}
