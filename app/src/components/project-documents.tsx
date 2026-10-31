import { addProjectDocument, linkProjectDeal, removeProjectDocument, replaceProjectDocument } from "@/actions/projects";
import { btn, btnOutline, field } from "@/components/ui";
import { serverTx } from "@/lib/i18n/server";

type Doc = { id: string; title: string; fileName: string; sizeBytes: number; version: number; updatedAt: Date };

function size(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Project documents. Owners add, replace and remove them; involved members open them. */
export async function ProjectDocuments({
  projectId,
  documents,
  isOwner,
  approved,
  deals,
  linkedDealId,
  back = "/profile",
}: {
  back?: string;
  projectId: string;
  documents: Doc[];
  isOwner: boolean;
  approved: boolean;
  deals?: { id: string; title: string }[];
  linkedDealId?: string;
}) {
  const tx = await serverTx();
  if (!isOwner && documents.length === 0) return null;
  return (
    <div className="mt-3 rounded border border-line bg-paper p-3" data-testid="project-documents">
      <p className="text-[13px] font-semibold uppercase tracking-wider text-brass">{tx("Documents")}</p>
      {documents.length === 0 ? <p className="mt-1 text-[15px] text-mut">{tx("No documents yet.")}</p> : null}
      <ul>
        {documents.map((doc) => (
          <li key={doc.id} className="border-b border-line py-2 last:border-0">
            <a href={`/api/project-documents/${doc.id}`} target="_blank" rel="noreferrer" className="text-[15px] font-semibold text-forest underline decoration-brass">
              {doc.title}
            </a>
            <span className="block text-[13px] text-mut">
              {doc.fileName} · {size(doc.sizeBytes)}
              {doc.version > 1 ? ` · ${tx("Version")} ${doc.version}` : ""}
            </span>
            {isOwner ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <form action={replaceProjectDocument} className="contents">
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="documentId" value={doc.id} />
                  <input type="hidden" name="back" value={back} />
                  <input name="file" type="file" accept="application/pdf,image/jpeg,image/png" required className="min-w-0 text-[14px]" aria-label={tx("Replace file")} />
                  <button className={btnOutline} type="submit">
                    {tx("Replace file")}
                  </button>
                </form>
                <form action={removeProjectDocument}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="documentId" value={doc.id} />
                  <input type="hidden" name="back" value={back} />
                  <button className={`${btnOutline} w-full`} type="submit">
                    {tx("Remove")}
                  </button>
                </form>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {isOwner ? (
        <form action={addProjectDocument} className="mt-2 grid gap-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="back" value={back} />
          <input name="title" className={`${field} text-[16px]`} placeholder={tx("Document title")} required />
          <input name="file" type="file" accept="application/pdf,image/jpeg,image/png" required className="min-w-0 text-[14px]" aria-label={tx("Upload a document")} />
          <button className={btn} type="submit">
            {tx("Upload a document")}
          </button>
          <p className="text-[14px] leading-relaxed text-mut">
            {approved
              ? tx("Changing documents does not send an approved project back to review. Everyone involved in this project gets an alert and an email about the change.")
              : tx("PDF, JPG, or PNG up to 5 MB.")}
          </p>
        </form>
      ) : null}
      {isOwner && deals && deals.length ? (
        <form action={linkProjectDeal} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="back" value={back} />
          <label className="block min-w-0">
            <span className="mb-1 block text-[13px] font-semibold uppercase tracking-wider text-mut">{tx("Linked deal room")}</span>
            <select name="dealId" defaultValue={linkedDealId || ""} className={`${field} text-[16px]`}>
              <option value="">{tx("None")}</option>
              {deals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.title}
                </option>
              ))}
            </select>
          </label>
          <button className={`${btnOutline} self-end`} type="submit">
            {tx("Save")}
          </button>
        </form>
      ) : null}
    </div>
  );
}
