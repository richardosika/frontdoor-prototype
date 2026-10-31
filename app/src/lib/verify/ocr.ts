/** Read a business-card image. PDF cards and any OCR failure stay blank so the check can say it was not read. */
export async function readCardImage(contentType: string, bytes: Uint8Array): Promise<string> {
  if (!contentType.startsWith("image/") || bytes.byteLength === 0) return "";
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    try {
      const result = await worker.recognize(Buffer.from(bytes));
      return (result.data.text || "").replace(/\s+/g, " ").trim().slice(0, 4000);
    } finally {
      await worker.terminate();
    }
  } catch {
    return "";
  }
}
