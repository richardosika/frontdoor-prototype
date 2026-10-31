import { sendEmail } from "@/lib/email";
import { isLocale } from "@/lib/i18n/messages";
import { notify } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/url";

export const DOC_MAX = 5 * 1024 * 1024;
export const DOC_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

export const DOC_ERROR = "Choose a PDF, JPG, PNG, or HEIC up to 5 MB.";
export const SUBMIT_FILES_MAX = 10;

/** Read one uploaded file. HEIC photos are converted to WebP so every browser can show them. */
export async function readUpload(file: File): Promise<{ fileName: string; contentType: string; sizeBytes: number; bytes: Uint8Array<ArrayBuffer> } | null> {
  if (file.size > DOC_MAX) return null;
  const raw = new Uint8Array(await file.arrayBuffer());
  const fileName = file.name.replace(/[^\w .()-]/g, "_").slice(0, 180) || "document";
  const { sniffImage, processImage } = await import("@/lib/member-images");
  if (sniffImage(raw) === "heic") {
    try {
      const out = await processImage(raw, "GALLERY", null);
      return { fileName: fileName.replace(/\.(heic|heif)$/i, "") + ".webp", contentType: out.contentType, sizeBytes: out.sizeBytes, bytes: new Uint8Array(out.bytes) };
    } catch {
      return null;
    }
  }
  const contentType = file.type || "application/octet-stream";
  if (!DOC_TYPES.has(contentType)) return null;
  return { fileName, contentType, sizeBytes: file.size, bytes: raw };
}


/** Tell everyone involved in the project, in their language. The project's review status never changes here. */
export async function announceDocumentChange(
  project: { id: string; name: string; userId: string; reviewStatus: string },
  owner: { name: string },
  change: "added" | "replaced" | "removed",
  documentTitle: string,
) {
  if (project.reviewStatus !== "APPROVED") return 0;
  const { projectAudience } = await import("@/lib/project-contact-db");
  const { projectDocumentEmail } = await import("@/lib/project-review-email");
  const ids = await projectAudience(project.id);
  if (!ids.length) return 0;
  const people = await prisma.user.findMany({ where: { id: { in: ids }, status: "ACTIVE" }, select: { id: true, email: true, locale: true, notifyDocuments: true } });
  const link = `${await appBaseUrl()}/projects/${project.id}`;
  for (const person of people) {
    const mail = projectDocumentEmail({
      locale: isLocale(person.locale) ? person.locale : "en",
      change,
      ownerName: owner.name,
      projectName: project.name,
      documentTitle,
      link,
    });
    await notify(person.id, { title: mail.subject, body: `${owner.name}: ${documentTitle}`, href: `/projects/${project.id}` });
    if (person.notifyDocuments) await sendEmail({ to: person.email, subject: mail.subject, text: mail.text });
  }
  return people.length;
}

