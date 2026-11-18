"use client";

import { useState } from "react";
import { respondToApplication } from "@/actions/apply";
import { btn, field, labelCls } from "@/components/ui";

export function ApplyReply({ token }: { token: string }) {
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function send() {
    setPending(true);
    setError("");
    const data = new FormData();
    data.set("token", token);
    data.set("note", note);
    if (file) data.set("businessCard", file);
    const result = await respondToApplication(data);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return <p className="mt-4 text-sm text-forest">Reply received. The application is in review again. Verification is in progress.</p>;
  }

  return (
    <div className="mt-4 space-y-3">
      {error ? <p className="text-sm text-brass">{error}</p> : null}
      <div>
        <label className={labelCls}>Your reply</label>
        <textarea className={field} rows={4} value={note} onChange={(event) => setNote(event.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Upload (optional)</label>
        <input className={field} type="file" accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        {file ? (
          <p className="mt-1 text-xs text-mut">
            {file.name} · {file.type || "file"} · {file.size} bytes
          </p>
        ) : null}
      </div>
      <button className={`${btn} w-full`} type="button" disabled={pending} onClick={send}>
        {pending ? "Sending…" : "Send reply"}
      </button>
    </div>
  );
}
