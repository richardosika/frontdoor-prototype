"use client";

import Link from "next/link";
import { btn, btnOutline } from "@/components/ui";

/** Join card actions. Sign in lives on the public homepage header, not here. */
export function LandingStart(_props: { signedIn?: boolean } = {}) {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <Link href="/join" className={btn}>Request to join</Link>
      <Link href="/join/code" className={btnOutline}>Referral code</Link>
    </div>
  );
}
