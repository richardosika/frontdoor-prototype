"use client";

import { useState } from "react";

export type UploadRowLabels = { heading: string; help: string; label: string; labelPlaceholder: string; file: string; add: string; remove: string };

const ACCEPT = "application/pdf,image/jpeg,image/png,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.heic,.heif";
const MAX_ROWS = 10;

/** Documents & photos attached when a project is submitted. Each row is one labeled file. */
export function ProjectUploadRows({ labels }: { labels: UploadRowLabels }) {
  const [rows, setRows] = useState<number[]>([0]);
  const [next, setNext] = useState(1);
  return (
    <fieldset className="grid gap-3 rounded border border-line bg-paper p-3 sm:col-span-2" data-testid="project-upload-rows">
      <legend className="px-1 text-[12px] font-semibold uppercase tracking-wider text-mut">{labels.heading}</legend>
      <p className="text-[14px] leading-relaxed text-mut">{labels.help}</p>
      {rows.map((key, index) => (
        <div key={key} className="grid gap-2 border-t border-line pt-3 first:border-t-0 first:pt-0 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="grid gap-1 text-[14px] text-ink">
            {labels.label}
            <input name="docTitle" maxLength={120} placeholder={labels.labelPlaceholder} className="min-h-11 rounded-sm border border-line bg-white px-3 text-[16px]" />
          </label>
          <label className="grid gap-1 text-[14px] text-ink">
            {labels.file}
            <input type="file" name="docFile" accept={ACCEPT} multiple={false} className="min-h-11 text-[15px]" data-testid={`project-upload-file-${index}`} />
          </label>
          {rows.length > 1 ? (
            <button type="button" onClick={() => setRows(rows.filter((r) => r !== key))} className="min-h-11 px-2 text-[14px] text-mut underline">
              {labels.remove}
            </button>
          ) : null}
        </div>
      ))}
      {rows.length < MAX_ROWS ? (
        <button type="button" onClick={() => { setRows([...rows, next]); setNext(next + 1); }} className="min-h-11 justify-self-start rounded-sm border border-forest px-4 text-[15px] text-forest" data-testid="project-upload-add">
          + {labels.add}
        </button>
      ) : null}
    </fieldset>
  );
}
