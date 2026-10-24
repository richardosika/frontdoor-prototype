"use client";

import { useMemo, useState } from "react";
import { createPost } from "@/actions/feed";
import { ModeratorNotice } from "@/components/moderator-notice";
import { btn, field, labelCls } from "@/components/ui";
import { SIZE_BANDS } from "@/lib/domain";
import { ASSET_CLASSES, US_STATES } from "@/lib/member-network";
import { PROJECT_NEEDS, PROJECT_STAGES } from "@/lib/project-filter";
import { ROLES, roleShort } from "@/lib/roles";

type Kind = "NORMAL" | "DEAL" | "SEEKING";

export function Composer({
  intents,
  rulesHtml,
}: {
  intents: { id: string; label: string; kind: "DEAL" | "SEEKING" }[];
  rulesHtml: string;
}) {
  const [kind, setKind] = useState<Kind>("NORMAL");
  const choices = useMemo(() => intents.filter((item) => item.kind === kind), [intents, kind]);
  const structured = kind !== "NORMAL";

  return (
    <form action={createPost} className="rounded border border-line bg-paper p-4">
      <input type="hidden" name="kind" value={kind} />
      <div className="mb-3 flex gap-2">
        {(
          [
            ["NORMAL", "Update"],
            ["DEAL", "Raising"],
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
      {structured && choices.length === 0 ? (
        <p className="text-sm text-ink">This post type is not available for your role. Choose the other one, or post an update.</p>
      ) : null}
      {structured && choices.length > 0 ? (
        <div className="mb-3">
          <label className={labelCls}>What you are posting</label>
          <select name="intent" className={field} defaultValue={choices[0]?.id} required>
            {choices.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <label className={labelCls}>{kind === "NORMAL" ? "Update" : "Details"}</label>
      <textarea
        name="body"
        required={kind === "NORMAL"}
        rows={3}
        placeholder={
          kind === "DEAL"
            ? "Role, market, asset class, and size. No return targets."
            : kind === "SEEKING"
              ? "Scope, timing, and what a good fit looks like."
              : "Share something your circle can act on."
        }
        className={field}
      />
      {structured && choices.length > 0 ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Title</label>
            <input name="title" required className={field} placeholder="Multifamily site, Austin TX" />
          </div>
          <div>
            <label className={labelCls}>{kind === "DEAL" ? "Amount" : "Size"}</label>
            <input name="raiseLabel" required className={field} placeholder={kind === "DEAL" ? "$2.5M" : "120 units"} />
          </div>
          <div>
            <label className={labelCls}>Asset class</label>
            <select name="assetClass" className={field} defaultValue="Multifamily" required>
              {ASSET_CLASSES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Project stage</label>
            <select name="stage" className={field} defaultValue="pre-construction" required>
              {PROJECT_STAGES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>What is needed</label>
            <select key={kind} name="need" className={field} defaultValue={kind === "SEEKING" ? "gc" : "equity"} required>
              {PROJECT_NEEDS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>State</label>
            <select name="market" className={field} defaultValue="NJ" required>
              {US_STATES.map((market) => (
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
          </div>
          {kind === "SEEKING" ? (
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
          ) : null}
          <div>
            <label className={labelCls}>Expires</label>
            <input name="expiresAt" type="date" className={field} />
          </div>
          {kind === "SEEKING" ? (
            <div>
              <label className={labelCls}>Timing</label>
              <input name="deadline" className={field} placeholder="Bids in November" />
            </div>
          ) : null}
        </div>
      ) : null}
      {structured && choices.length > 0 ? (
        <div className="mt-3 rounded border border-line bg-cream p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Seeking and Raising rules</p>
          <div className="mt-2 max-h-64 overflow-y-auto text-sm" dangerouslySetInnerHTML={{ __html: rulesHtml }} />
          <label className="mt-3 flex items-start gap-2 text-sm text-ink">
            <input type="checkbox" name="rulesAck" value="yes" required className="mt-1" />
            <span>I have read these rules. This post does not offer securities or promise a return. Dues are a flat fee, and none are charged on this test.</span>
          </label>
        </div>
      ) : null}
      <div className="mt-3 flex justify-end">
        <button className={btn} type="submit" disabled={structured && choices.length === 0}>
          {kind === "DEAL" ? "Post raising" : kind === "SEEKING" ? "Post seeking" : "Post"}
        </button>
      </div>
      <div className="mt-2">
        <ModeratorNotice />
      </div>
    </form>
  );
}
