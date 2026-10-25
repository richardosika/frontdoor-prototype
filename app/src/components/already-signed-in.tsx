"use client";

import { useEffect, useState } from "react";
import { logoutAction } from "@/actions/auth";
import { btn, btnOutline } from "@/components/ui";
import { alreadySignedInNotice, isSignedInJoinEntry } from "@/lib/session-gate";

export function AlreadySignedInNotice({ name }: { name: string }) {
  return (
    <section className="rounded border border-brass bg-paper px-4 py-4" aria-live="polite" data-testid="already-signed-in">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Already signed in</p>
      <p className="mt-2 font-serif text-xl font-normal leading-snug text-forest">{alreadySignedInNotice(name)}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <form action={logoutAction}>
          <button className={btn} type="submit">
            Sign out
          </button>
        </form>
        <a href="/feed" className={btnOutline}>
          Go to feed
        </a>
      </div>
    </section>
  );
}

/** The homepage anchor survives the redirect to the feed. The server never sees the hash, so this reads it in the browser. */
export function JoinEntryBanner({ name }: { name: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const read = () => setShow(isSignedInJoinEntry(window.location.pathname, window.location.hash));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  if (!show) return null;
  return (
    <div className="mb-4">
      <AlreadySignedInNotice name={name} />
    </div>
  );
}
