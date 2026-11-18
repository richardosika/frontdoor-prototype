"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveVendorSuggestion, declineVendorSuggestion } from "@/actions/vendor-suggestions";

const sm = "inline-flex min-h-9 items-center whitespace-nowrap rounded-sm px-3 text-[12px] font-semibold";
const gold = `${sm} bg-brass text-forest`;
const ghost = `${sm} border border-line bg-paper text-ink`;

export function VendorSuggestionActions({ id, status, link, applicationHref, demandOnly }: { id: string; status: string; link: string; applicationHref: string; demandOnly: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [current, setCurrent] = useState(link);

  async function run(kind: "approve" | "decline") {
    setBusy(true);
    setMsg("");
    const result = kind === "approve" ? await approveVendorSuggestion(id) : await declineVendorSuggestion(id);
    setBusy(false);
    if (!result.ok) return setMsg(result.error);
    if (result.link) setCurrent(result.link);
    router.refresh();
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(current);
      setMsg("Link copied.");
    } catch {
      setMsg(current);
    }
  }
  return (
    <div className="flex flex-wrap content-start items-start gap-1.5" data-testid="suggestion-actions">
      {status === "IN_REVIEW" && !demandOnly ? (
        <button type="button" className={gold} disabled={busy} onClick={() => run("approve")} data-testid="approve-suggestion">
          Approve &amp; create referral link
        </button>
      ) : null}
      {status === "IN_REVIEW" || status === "LINK_SENT" ? (
        <button type="button" className={ghost} disabled={busy} onClick={() => run("decline")} data-testid="decline-suggestion">
          Decline
        </button>
      ) : null}
      {current && (status === "LINK_SENT" || status === "IN_REVIEW") ? (
        <button type="button" className={ghost} onClick={copy} data-testid="copy-link" data-link={current}>
          Copy link
        </button>
      ) : null}
      {applicationHref ? (
        <a className={ghost} href={applicationHref} data-testid="open-application">
          Open application
        </a>
      ) : null}
      {msg ? <p className="w-full text-[12px] text-mut [overflow-wrap:anywhere]">{msg}</p> : null}
    </div>
  );
}
