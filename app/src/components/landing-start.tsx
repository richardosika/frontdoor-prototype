"use client";

import { useState } from "react";
import Link from "next/link";
import { JoinLanguages } from "@/components/join-languages";
import { RequestInviteForm } from "@/components/request-invite-form";
import { btn, btnOutline } from "@/components/ui";
import { INVITE_REQUEST_THANKS_TITLE, requestReceivedMessage } from "@/lib/applicant-copy";
import { memberLoginHref } from "@/lib/session-gate";

export function LandingStart({ signedIn = false }: { signedIn?: boolean }) {
  const [done, setDone] = useState(false);
  const [thanksName, setThanksName] = useState("");
  const [statusPath, setStatusPath] = useState("");

  if (done) {
    return (
      <div className="mt-8 rounded border border-brass bg-brass-soft px-4 py-5">
        <h2 className="font-serif text-2xl font-normal">{INVITE_REQUEST_THANKS_TITLE}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink">{requestReceivedMessage(thanksName)}</p>
        {statusPath ? (
          <a className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brass" href={statusPath}>
            Check your status
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href="#request-to-join" className={btn}>
          Request to join
        </a>
        <Link href="/apply" className={btnOutline}>
          Request to join
        </Link>
        <Link href={memberLoginHref(signedIn)} className={btnOutline}>
          Sign in
        </Link>
      </div>
      <JoinLanguages />
      <RequestInviteForm
        onSubmitted={(firstName, nextStatusPath) => {
          setThanksName(firstName);
          setStatusPath(nextStatusPath);
          setDone(true);
        }}
      />
    </>
  );
}
