"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { GALLERY_MAX, IMAGE_MAX_BYTES, parseCrop, processImage, sniffImage, type ImageKind } from "@/lib/member-images";
import { prisma } from "@/lib/prisma";

function go(key: "error" | "notice", text: string): never {
  redirect(`/profile?${key}=${encodeURIComponent(text)}#photos`);
}

function refresh(userId: string) {
  revalidatePath("/profile");
  revalidatePath(`/members/${userId}`);
  revalidatePath("/feed");
  revalidatePath("/network");
}

/** Upload a profile photo, cover image or gallery photo. Converted and resized on the server. */
export async function uploadMemberImage(formData: FormData) {
  const user = await requireUser();
  const kindValue = String(formData.get("kind") || "");
  if (kindValue !== "AVATAR" && kindValue !== "COVER" && kindValue !== "GALLERY") go("error", "Choose an image.");
  const kind = kindValue as ImageKind;
  const upload = formData.get("file");
  const file = upload instanceof File && upload.size > 0 ? upload : null;
  if (!file) go("error", "Choose an image.");
  if (file.size > IMAGE_MAX_BYTES) go("error", "Images can be up to 5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniffImage(bytes)) go("error", "Use a JPG, PNG, HEIC, WebP, or GIF image.");
  if (kind === "GALLERY" && (await prisma.memberImage.count({ where: { userId: user.id, kind: "GALLERY" } })) >= GALLERY_MAX) {
    go("error", "The gallery holds up to 12 photos. Remove one first.");
  }
  let processed: Awaited<ReturnType<typeof processImage>>;
  try {
    processed = await processImage(bytes, kind, kind === "GALLERY" ? null : parseCrop(formData.get("crop")));
  } catch {
    go("error", "That image could not be read. Try a JPG or PNG.");
  }
  const caption = String(formData.get("caption") || "").trim().slice(0, 200);
  const last = kind === "GALLERY" ? await prisma.memberImage.findFirst({ where: { userId: user.id, kind }, orderBy: { position: "desc" } }) : null;
  const image = await prisma.memberImage.create({
    data: { userId: user.id, kind, caption, position: (last?.position ?? -1) + 1, ...processed },
  });
  if (kind !== "GALLERY") {
    await prisma.memberImage.deleteMany({ where: { userId: user.id, kind, id: { not: image.id } } });
    await prisma.user.update({ where: { id: user.id }, data: kind === "AVATAR" ? { photoId: image.id } : { coverId: image.id } });
  }
  refresh(user.id);
  go("notice", kind === "AVATAR" ? "Profile photo saved." : kind === "COVER" ? "Cover image saved." : "Photo added.");
}

export async function removeMemberImage(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("imageId") || "");
  const image = await prisma.memberImage.findUnique({ where: { id }, select: { id: true, userId: true, kind: true } });
  if (!image || image.userId !== user.id) go("error", "Image not found.");
  await prisma.memberImage.delete({ where: { id } });
  if (image.kind === "AVATAR") await prisma.user.update({ where: { id: user.id }, data: { photoId: "" } });
  if (image.kind === "COVER") await prisma.user.update({ where: { id: user.id }, data: { coverId: "" } });
  refresh(user.id);
  go("notice", "Image removed.");
}

export async function saveGalleryCaption(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("imageId") || "");
  const caption = String(formData.get("caption") || "").trim().slice(0, 200);
  const updated = await prisma.memberImage.updateMany({ where: { id, userId: user.id, kind: "GALLERY" }, data: { caption } });
  if (!updated.count) go("error", "Image not found.");
  refresh(user.id);
  go("notice", "Caption saved.");
}

/** Move a gallery photo one place earlier or later. */
export async function moveGalleryImage(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("imageId") || "");
  const direction = formData.get("direction") === "up" ? -1 : 1;
  const images = await prisma.memberImage.findMany({ where: { userId: user.id, kind: "GALLERY" }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const ids = images.map((item) => item.id);
  const index = ids.indexOf(id);
  const swap = index + direction;
  if (index < 0 || swap < 0 || swap >= ids.length) go("notice", "Order saved.");
  [ids[index], ids[swap]] = [ids[swap], ids[index]];
  await prisma.$transaction(ids.map((imageId, position) => prisma.memberImage.update({ where: { id: imageId }, data: { position } })));
  refresh(user.id);
  go("notice", "Order saved.");
}
