"use client";

import { useState } from "react";
import { createPost } from "@/actions/feed";
import { ModeratorNotice } from "@/components/moderator-notice";
import { btn, field, labelCls } from "@/components/ui";
import { SIZE_BANDS, MARKETS } from "@/lib/domain";
import { ROLES, roleShort } from "@/lib/roles";

type Kind = "NORMAL" | "DEAL" | "SEEKING";

export function Composer() {
  const [kind, setKind] = useState<Kind>("NORMAL");
  return (
    <form action={createPost} className="rounded border border-line bg-paper p-4">
      <input type="hidden" name="kind" value={kind} />
      <div className="mb-3 flex gap-2">
        {(
          [
            ["NORMAL", "Update"],
            ["DEAL", "Deal"],
            ["SEEKING", "Seeking"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={`min-h-11 rounded-sm px-3 font-sans text-xs font-semibold tracking-[0.06em] [font-variant:all-small-caps] ${
              kind === value ? "bg-forest text-paper" : "border border-line text-mut"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <label className={labelCls}>{kind === "NORMAL" ? "Update" : "Details"}</label>
      <textarea
        name="body"
        required={kind === "NORMAL"}
        rows={3}
        placeholder={
          kind === "DEAL"
            ? "What should members know before they request access?"
            : kind === "SEEKING"
              ? "Scope, timing, and what a good fit looks like."
              : "Share something your circle can act on."
        }
        className={field}
      />
      {kind !== "NORMAL" ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Title</label>
            <input name="title" required className={field} placeholder="18-unit multifamily, Newark NJ" />
          </div>
          <div>
            <label className={labelCls}>{kind === "DEAL" ? "Raising" : "Size"}</label>
            <input name="raiseLabel" required className={field} placeholder={kind === "DEAL" ? "$2.5M" : "40k sf"} />
          </div>
          <div>
            <label className={labelCls}>Asset class</label>
            <input name="assetClass" required className={field} placeholder="Multifamily" />
          </div>
          <div>
            <label className={labelCls}>Market</label>
            <select name="market" className={field} defaultValue="NJ">
              {MARKETS.map((market) => (
                <option key={market}>{market}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>{kind === "SEEKING" ? "Dollar band" : "Size band"}</label>
            <select name="sizeBand" className={field} defaultValue="1-5">
              {SIZE_BANDS.map((band) => (
                <option key={band.id} value={band.id}>
                  {band.label}
                </option>
              ))}
            </select>
            {kind === "SEEKING" ? (
              <p className="mt-1 text-[11px] leading-snug text-mut">
                Square feet, units, and parcels are filed under Other scope, not a dollar band.
              </p>
            ) : null}
          </div>
          {kind === "DEAL" ? (
            <>
              <div>
                <label className={labelCls}>Target IRR</label>
                <input name="targetIrr" className={field} placeholder="17.4%" />
              </div>
              <div>
                <label className={labelCls}>Minimum</label>
                <input name="minCheck" className={field} placeholder="$100K" />
              </div>
              <div>
                <label className={labelCls}>Equity multiple</label>
                <input name="equityMultiple" className={field} placeholder="1.8x" />
              </div>
            </>
          ) : (
            <>
              <div className="sm:col-span-2">
                <label className={labelCls}>Role needed</label>
                <select name="roleNeeded" className={field} defaultValue="GENERAL_CONTRACTOR">
                  {ROLES.map((role) => (
                    <option key={role.id} value={role.id}>
                      {roleShort(role.label)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Deadline</label>
                <input name="deadline" className={field} placeholder="Bids Nov 15" />
              </div>
            </>
          )}
        </div>
      ) : null}
      <div className="mt-3 flex justify-end">
        <button className={btn} type="submit">
          {kind === "DEAL" ? "Post deal" : kind === "SEEKING" ? "Post need" : "Post"}
        </button>
      </div>
      {kind === "DEAL" ? (
        <p className="mt-2 text-[11px] leading-relaxed text-mut">
          Raise posts stay inside the member network and do not open a subscription. Deal materials stay behind an NDA acknowledgement.
        </p>
      ) : null}
      <div className="mt-2">
        <ModeratorNotice />
      </div>
    </form>
  );
}
