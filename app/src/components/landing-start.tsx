"use client";

import Link from "next/link";
import { btn, btnOutline } from "@/components/ui";
import { memberLoginHref } from "@/lib/session-gate";

export function LandingStart({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/join" className={btn}>Request to join</Link>
        <Link href="/join/code" className={btnOutline}>Referral code</Link>
      </div>
      <p className="mt-4">
        <Link href={memberLoginHref(signedIn)} className="text-sm font-semibold uppercase tracking-[0.12em] text-brass">Sign in</Link>
      </p>
    </>
  );
}
