"use client";

import { useState } from "react";
import Link from "next/link";
import { RequestInviteForm } from "@/components/request-invite-form";
import { btn, btnOutline } from "@/components/ui";
import { INVITE_REQUEST_THANKS_BODY, INVITE_REQUEST_THANKS_TITLE } from "@/lib/applicant-copy";
import { memberLoginHref } from "@/lib/session-gate";

export function LandingStart({ signedIn = false }: { signedIn?: boolean }) {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="mt-8 rounded border border-brass bg-brass-soft px-4 py-5">
        <h2 className="font-serif text-2xl font-normal">{INVITE_REQUEST_THANKS_TITLE}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink">{INVITE_REQUEST_THANKS_BODY}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href="#request-invite" className={btn}>
          Request to join
        </a>
        <Link href="/apply" className={btnOutline}>
          Apply with an invite
        </Link>
        <Link href={memberLoginHref(signedIn)} className={btnOutline}>
          Sign in
        </Link>
      </div>
      <RequestInviteForm onSubmitted={() => setDone(true)} />
    </>
  );
}
