"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createCustomTestApplicant } from "@/actions/owner";
import { btn, field, labelCls } from "@/components/ui";

export function CreateTestApplicantForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [href, setHref] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    setHref("");
    try {
      const result = await createCustomTestApplicant(new FormData(event.currentTarget));
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setMessage(result.message);
      setHref(result.href);
    } catch {
      setError("The applicant was not created. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3">
      {error ? <p className="rounded border border-brass bg-brass-soft px-3 py-2 text-sm text-forest">{error}</p> : null}
      {message && href ? (
        <p className="rounded border border-brass bg-brass-soft px-3 py-2 text-sm text-forest">
          {message}{" "}
          <Link href={href} className="font-semibold underline decoration-brass">
            Open the application
          </Link>
        </p>
      ) : null}
      <label className="block">
        <span className={labelCls}>Name</span>
        <input className={field} name="name" required placeholder="Stephen Ross" />
      </label>
      <label className="block">
        <span className={labelCls}>Company</span>
        <input className={field} name="org" required placeholder="Related Companies" />
      </label>
      <label className="block">
        <span className={labelCls}>Email</span>
        <input className={field} name="email" type="email" required placeholder="stephen.ross.probe@example.com" />
      </label>
      <label className="block">
        <span className={labelCls}>Website</span>
        <input className={field} name="website" type="text" inputMode="url" placeholder="www.related.com" />
      </label>
      <label className="block">
        <span className={labelCls}>Location</span>
        <input className={field} name="location" placeholder="New York, NY" />
      </label>
      <button className={btn} type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create and run verification"}
      </button>
    </form>
  );
}
