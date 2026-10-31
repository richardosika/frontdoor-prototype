"use client";

import { useState } from "react";
import { renderTemplate } from "@/lib/email-templates";
import { btn, btnOutline, field, labelCls } from "@/components/ui";

export function TemplateEditor({
  templateKey,
  initialSubject,
  initialBody,
  sample,
  save,
  sendTest,
}: {
  templateKey: string;
  initialSubject: string;
  initialBody: string;
  sample: Record<string, string>;
  save: (formData: FormData) => Promise<void>;
  sendTest: (formData: FormData) => Promise<void>;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  return (
    <div className="mt-4 grid gap-4">
      <form action={save} className="grid gap-3">
        <input type="hidden" name="key" value={templateKey} />
        <label>
          <span className={labelCls}>Subject</span>
          <input name="subject" className={field} value={subject} onChange={(event) => setSubject(event.target.value)} required />
        </label>
        <label>
          <span className={labelCls}>Body</span>
          <textarea name="body" className={field} rows={16} value={body} onChange={(event) => setBody(event.target.value)} required />
        </label>
        <button className={btn} type="submit">
          Save version
        </button>
      </form>
      <section className="rounded border border-line bg-cream p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Preview</h2>
        <p className="mt-2 text-sm font-semibold">{renderTemplate(subject, sample)}</p>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-ink">{renderTemplate(body, sample)}</pre>
      </section>
      <form action={sendTest}>
        <input type="hidden" name="key" value={templateKey} />
        <button className={btnOutline} type="submit">
          Send test to the test recipient
        </button>
        <p className="mt-2 text-xs text-mut">Sends the saved version. It lands in the Outbox only.</p>
      </form>
    </div>
  );
}
