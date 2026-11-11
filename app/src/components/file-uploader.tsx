"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useTx } from "@/components/locale-context";
import { prepareUpload, formatBytes, UPLOAD_MAX_FILES } from "@/lib/upload-client";

type Item = { key: string; file: File; label: string; preview: string; error: string; note: string; progress: number; done: boolean };

const ACCEPT = "application/pdf,image/jpeg,image/png,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.heic,.heif";

/**
 * #34: one uploader for project documents and photos. Pick several files at once or drag them in; every file is
 * listed with a thumbnail, name, size, an editable label and Remove. Large photos are resized on the device.
 * mode "form": files ride along with the surrounding form (Add a project). mode "direct": uploads each file to the
 * project with per-file progress (project page).
 */
export function FileUploader({ mode, projectId }: { mode: "form" | "direct"; projectId?: string }) {
  const tx = useTx();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState("");
  const pick = useRef<HTMLInputElement>(null);
  const carrier = useRef<HTMLInputElement>(null);

  // In form mode, mirror the good files into a hidden file input so the form submits them in order.
  useEffect(() => {
    if (mode !== "form" || !carrier.current) return;
    const dt = new DataTransfer();
    for (const item of items) if (!item.error) dt.items.add(item.file);
    carrier.current.files = dt.files;
  }, [items, mode]);

  async function add(list: FileList | File[]) {
    const incoming = Array.from(list);
    const room = UPLOAD_MAX_FILES - items.length;
    const accepted = incoming.slice(0, Math.max(0, room));
    const prepared = await Promise.all(
      accepted.map(async (raw, i) => {
        const out = await prepareUpload(raw);
        return {
          key: `${Date.now()}-${i}-${raw.name}`,
          file: out.file,
          label: raw.name.replace(/\.[^.]+$/, "").slice(0, 120),
          preview: out.file.type.startsWith("image/") && !/heic|heif/i.test(out.file.type) ? URL.createObjectURL(out.file) : "",
          error: out.error ? tx(out.error) : "",
          note: out.resized ? tx("Resized on your device to fit the 5 MB limit.") : "",
          progress: 0,
          done: false,
        } satisfies Item;
      }),
    );
    setItems((current) => [...current, ...prepared]);
    setSummary(incoming.length > accepted.length ? tx("Attach up to 10 files.") : "");
  }

  function remove(key: string) {
    setItems((current) => {
      const gone = current.find((item) => item.key === key);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return current.filter((item) => item.key !== key);
    });
  }

  async function uploadAll() {
    if (!projectId) return;
    setBusy(true);
    let failed = 0;
    for (const item of items) {
      if (item.error || item.done) continue;
      const result = await sendOne(projectId, item, (progress) => setItems((cur) => cur.map((row) => (row.key === item.key ? { ...row, progress } : row))));
      if (!result.ok) failed += 1;
      setItems((cur) => cur.map((row) => (row.key === item.key ? { ...row, done: result.ok, progress: result.ok ? 100 : 0, error: result.ok ? "" : tx(result.error) } : row)));
    }
    setBusy(false);
    setSummary(failed ? tx("Some files did not upload. Check the messages next to them.") : tx("All files uploaded."));
    router.refresh();
    if (!failed) setTimeout(() => setItems((cur) => cur.filter((row) => !row.done)), 1200);
  }

  const good = items.filter((item) => !item.error && !item.done);
  return (
    <div className="grid gap-3 rounded border border-line bg-paper p-3 sm:col-span-2" data-testid="file-uploader">
      <p className="text-[14px] font-semibold text-forest">{tx("Documents & photos")}</p>
      <p className="text-[14px] leading-relaxed text-mut">{tx("Attach plans, budgets, renderings, or site photos for staff review. PDF, JPG, PNG, or HEIC, up to 5 MB each.")}</p>
      <div
        onDragOver={(event) => { event.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => { event.preventDefault(); setOver(false); if (event.dataTransfer.files.length) void add(event.dataTransfer.files); }}
        className={`grid place-items-center gap-2 rounded border-2 border-dashed px-4 py-5 text-center ${over ? "border-brass bg-brass-soft" : "border-line bg-cream"}`}
        data-testid="file-drop"
      >
        <p className="text-[15px] text-ink">{tx("Drag files here, or")}</p>
        <button type="button" onClick={() => pick.current?.click()} className="min-h-11 rounded-sm border border-forest bg-paper px-4 text-[15px] font-semibold text-forest" data-testid="file-choose">
          {tx("Choose files")}
        </button>
        <input ref={pick} type="file" accept={ACCEPT} multiple className="sr-only" tabIndex={-1} aria-label={tx("Choose files")} data-testid="file-picker"
          onChange={(event) => { if (event.target.files?.length) void add(event.target.files); event.target.value = ""; }} />
      </div>
      {items.length ? (
        <ul className="grid gap-2" data-testid="file-list">
          {items.map((item) => (
            <li key={item.key} className={`grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded border p-2 ${item.error ? "border-brass bg-brass-soft" : "border-line bg-white"}`} data-testid="file-row">
              {item.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.preview} alt="" className="h-12 w-12 rounded-sm object-cover" />
              ) : (
                <span aria-hidden className="grid h-12 w-12 place-items-center rounded-sm border border-line bg-cream text-[11px] font-bold uppercase text-forest">
                  {(item.file.name.split(".").pop() || "file").slice(0, 4)}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-ink">{item.file.name}</p>
                <p className="text-[13px] text-mut">{formatBytes(item.file.size)}{item.note ? ` · ${item.note}` : ""}</p>
                {item.error ? (
                  <p className="text-[13px] font-semibold text-brass" role="alert" data-testid="file-error">{item.error}</p>
                ) : item.done ? (
                  <p className="text-[13px] font-semibold text-forest">✓ {tx("Uploaded")}</p>
                ) : (
                  <label className="mt-1 block">
                    <span className="sr-only">{tx("Label")}</span>
                    <input value={item.label} maxLength={120} placeholder={tx("e.g. Site plan")}
                      onChange={(event) => setItems((cur) => cur.map((row) => (row.key === item.key ? { ...row, label: event.target.value } : row)))}
                      className="min-h-10 w-full rounded-sm border border-line bg-white px-2 text-[16px]" aria-label={tx("Label")} data-testid="file-label" />
                  </label>
                )}
                {busy && !item.error && !item.done ? (
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream" aria-hidden><div className="h-full bg-brass transition-all" style={{ width: `${item.progress}%` }} /></div>
                ) : null}
              </div>
              {!busy && !item.done ? (
                <button type="button" onClick={() => remove(item.key)} className="min-h-11 px-2 text-[14px] text-mut underline" data-testid="file-remove">
                  {tx("Remove")}
                </button>
              ) : <span />}
              {mode === "form" && !item.error ? <input type="hidden" name="docTitle" value={item.label} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {summary ? <p className="text-[14px] font-semibold text-forest" role="status">{summary}</p> : null}
      {mode === "form" ? (
        <>
          <input ref={carrier} type="file" name="docFile" multiple className="hidden" tabIndex={-1} aria-hidden />
          <FormProgress count={good.length} bytes={good.reduce((sum, item) => sum + item.file.size, 0)} />
        </>
      ) : (
        <button type="button" disabled={busy || good.length === 0} onClick={() => void uploadAll()} className="min-h-11 justify-self-start rounded-sm bg-forest px-4 text-[14px] font-semibold uppercase tracking-[0.08em] text-paper disabled:opacity-50" data-testid="file-upload">
          {busy ? tx("Uploading…") : tx("Upload files")}
        </button>
      )}
    </div>
  );
}

/** While the surrounding form submits, show that the files are on their way. */
function FormProgress({ count, bytes }: { count: number; bytes: number }) {
  const { pending } = useFormStatus();
  const tx = useTx();
  if (!pending || count === 0) return null;
  return (
    <div role="status" className="grid gap-1" data-testid="file-form-progress">
      <p className="text-[14px] font-semibold text-forest">{tx("Uploading {count} files ({size}). Keep this page open.").replace("{count}", String(count)).replace("{size}", formatBytes(bytes))}</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-cream"><div className="h-full w-1/3 animate-pulse bg-brass" /></div>
    </div>
  );
}

function sendOne(projectId: string, item: Item, onProgress: (n: number) => void): Promise<{ ok: true } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const body = new FormData();
    body.set("projectId", projectId);
    body.set("title", item.label);
    body.set("file", item.file, item.file.name);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/project-documents");
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 95)); };
    xhr.onload = () => {
      let data: { ok?: boolean; error?: string } = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && data.ok) resolve({ ok: true });
      else resolve({ ok: false, error: data.error || (xhr.status === 413 ? "Choose a PDF, JPG, PNG, or HEIC up to 5 MB." : "Upload failed. Try again.") });
    };
    xhr.onerror = () => resolve({ ok: false, error: "Upload failed. Try again." });
    xhr.send(body);
  });
}
