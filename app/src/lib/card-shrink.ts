/**
 * Nov 7 (Stephanie, phone): a phone photo of a business card is often over the 5 MB limit. The join form used to send
 * it as is, the server refused it, and the message landed far from the upload box, so the page looked stuck. Photos
 * are now made smaller in the browser before they are sent. PDFs and small images are sent unchanged.
 */
export const CARD_SHRINK_OVER_BYTES = 1.5 * 1024 * 1024;
export const CARD_MAX_EDGE = 2000;
export const CARD_LIMIT_BYTES = 5 * 1024 * 1024;
export const CARD_TOO_BIG_ERROR = "Business card must be 5 MB or smaller. Try a photo or a smaller PDF.";

export function cardNeedsShrink(file: { type: string; size: number }): boolean {
  return file.type.startsWith("image/") && (file.size > CARD_SHRINK_OVER_BYTES || !["image/jpeg", "image/png"].includes(file.type));
}

export function shrunkSize(width: number, height: number, maxEdge = CARD_MAX_EDGE): { width: number; height: number } {
  const edge = Math.max(width, height);
  if (edge <= maxEdge) return { width, height };
  const scale = maxEdge / edge;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function shrunkCardName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "business-card";
  return `${base}.jpg`;
}

/** Browser only. Returns a JPEG under the limit, or null when the photo cannot be read (the original is sent then). */
export async function shrinkCardImage(file: File): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = shrunkSize(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close?.();
    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= CARD_LIMIT_BYTES) return new File([blob], shrunkCardName(file.name), { type: "image/jpeg" });
    }
    return null;
  } catch {
    return null;
  }
}
