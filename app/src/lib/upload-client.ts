/** Browser-side checks for project uploads (#34). Server checks stay authoritative (src/lib/project-upload.ts). */
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const UPLOAD_MAX_FILES = 10;
const MAX_EDGE = 2800;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function uploadKind(file: { name: string; type: string }): "pdf" | "image" | "heic" | "other" {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (/heic|heif/.test(file.type) || /\.(heic|heif)$/.test(name)) return "heic";
  if (/^image\/(jpeg|png)$/.test(file.type) || /\.(jpe?g|png)$/.test(name)) return "image";
  return "other";
}

/** What happens to a file before upload: accepted as is, resized on the device, or refused with a reason. */
export function uploadPlan(file: { name: string; type: string; size: number }): "ok" | "resize" | "tooBig" | "badType" {
  const kind = uploadKind(file);
  if (kind === "other") return "badType";
  if (kind === "image" && file.size > UPLOAD_MAX_BYTES * 0.9) return "resize";
  if (file.size > UPLOAD_MAX_BYTES) return "tooBig";
  return "ok";
}

export const UPLOAD_ERRORS = {
  badType: "This file type is not accepted. Use PDF, JPG, PNG, or HEIC.",
  tooBig: "This file is over 5 MB. Choose a smaller file.",
} as const;

/** Resize a large JPG or PNG in the browser so it fits under 5 MB. */
export async function prepareUpload(file: File): Promise<{ file: File; resized: boolean; error: string }> {
  const plan = uploadPlan(file);
  if (plan === "badType") return { file, resized: false, error: UPLOAD_ERRORS.badType };
  if (plan === "tooBig") return { file, resized: false, error: UPLOAD_ERRORS.tooBig };
  if (plan === "ok") return { file, resized: false, error: "" };
  try {
    const bitmap = await createImageBitmap(file);
    for (const [edge, quality] of [[MAX_EDGE, 0.86], [2000, 0.8], [1600, 0.75]] as const) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= UPLOAD_MAX_BYTES) {
        const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
        return { file: new File([blob], name, { type: "image/jpeg" }), resized: true, error: "" };
      }
    }
  } catch {
    // fall through
  }
  return file.size <= UPLOAD_MAX_BYTES ? { file, resized: false, error: "" } : { file, resized: false, error: UPLOAD_ERRORS.tooBig };
}
