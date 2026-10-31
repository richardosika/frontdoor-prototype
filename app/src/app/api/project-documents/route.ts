import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/current-user";
import { blocksMembership } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { DOC_ERROR, announceDocumentChange, readUpload } from "@/lib/project-upload";

export const dynamic = "force-dynamic";

/** #34: one labeled file per request so the uploader can show per-file progress and errors. Owner only. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || user.status !== "ACTIVE" || (!user.isAdmin && blocksMembership(user.paymentStatus))) return Response.json({ error: "Sign in again." }, { status: 401 });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: DOC_ERROR }, { status: 400 });
  }
  const projectId = String(form.get("projectId") || "");
  const project = await prisma.trackProject.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== user.id) return Response.json({ error: "Project not found." }, { status: 404 });
  const upload = form.get("file");
  if (!(upload instanceof File) || upload.size === 0) return Response.json({ error: DOC_ERROR }, { status: 400 });
  const read = await readUpload(upload);
  if (!read) return Response.json({ error: DOC_ERROR }, { status: 400 });
  const title = String(form.get("title") || "").trim().slice(0, 120) || upload.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Document";
  const doc = await prisma.projectDocument.create({ data: { projectId: project.id, title, ...read } });
  await announceDocumentChange(project, user, "added", title).catch(() => 0);
  revalidatePath("/projects/[id]", "page");
  revalidatePath("/admin/projects");
  return Response.json({ ok: true, id: doc.id });
}
