/** Profile photo, cover image and gallery: accepted formats, crop math and server-side conversion. */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const GALLERY_MAX = 12;
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png,.webp,.gif";

export type ImageKind = "AVATAR" | "COVER" | "GALLERY";

/** Output sizes. Avatar is square, the cover is a wide banner, gallery images keep their shape. */
export const IMAGE_TARGET: Record<ImageKind, { width: number; height: number; aspect: number | null }> = {
  AVATAR: { width: 512, height: 512, aspect: 1 },
  COVER: { width: 1600, height: 500, aspect: 3.2 },
  GALLERY: { width: 1600, height: 1600, aspect: null },
};

export type ImageFormat = "jpeg" | "png" | "webp" | "gif" | "heic";

/** The real format from the file's first bytes. The browser's type and the file name are not trusted. */
export function sniffImage(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "gif";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand)) return "heic";
  }
  return null;
}

export type Crop = { x: number; y: number; w: number; h: number };

/** Crop as fractions of the image (0..1). Anything missing or broken means the whole image. */
export function parseCrop(value: unknown): Crop | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const raw = JSON.parse(value) as Record<string, unknown>;
    const n = (key: string) => (typeof raw[key] === "number" && Number.isFinite(raw[key]) ? (raw[key] as number) : NaN);
    let [x, y, w, h] = [n("x"), n("y"), n("w"), n("h")];
    if ([x, y, w, h].some(Number.isNaN)) return null;
    w = Math.min(Math.max(w, 0.02), 1);
    h = Math.min(Math.max(h, 0.02), 1);
    x = Math.min(Math.max(x, 0), 1 - w);
    y = Math.min(Math.max(y, 0), 1 - h);
    return { x, y, w, h };
  } catch {
    return null;
  }
}

/** Pixel rectangle for sharp.extract, inside the image. */
export function cropRect(crop: Crop, width: number, height: number) {
  const left = Math.min(Math.max(Math.round(crop.x * width), 0), width - 1);
  const top = Math.min(Math.max(Math.round(crop.y * height), 0), height - 1);
  return {
    left,
    top,
    width: Math.max(1, Math.min(Math.round(crop.w * width), width - left)),
    height: Math.max(1, Math.min(Math.round(crop.h * height), height - top)),
  };
}

/** Centered crop at an aspect ratio, as fractions. Used when no crop was sent. */
export function centerCrop(width: number, height: number, aspect: number): Crop {
  const imageAspect = width / height;
  if (imageAspect > aspect) {
    const w = aspect / imageAspect;
    return { x: (1 - w) / 2, y: 0, w, h: 1 };
  }
  const h = imageAspect / aspect;
  return { x: 0, y: (1 - h) / 2, w: 1, h };
}

const HEIC_WORKER = `
const { parentPort, workerData } = require("node:worker_threads");
require("heic-decode")({ buffer: Buffer.from(workerData) })
  .then((r) => parentPort.postMessage({ width: r.width, height: r.height, data: r.data }))
  .catch((e) => parentPort.postMessage({ error: String(e && e.message || e) }));
`;

/** HEIC decoding is slow pure JS/wasm; run it on a worker thread so the server keeps answering other requests. */
async function decodeHeic(input: Uint8Array): Promise<{ width: number; height: number; data: Uint8Array }> {
  const { Worker } = await import("node:worker_threads");
  return new Promise((resolve, reject) => {
    const worker = new Worker(HEIC_WORKER, { eval: true, workerData: input, resourceLimits: { maxOldGenerationSizeMb: 192 } });
    const timer = setTimeout(() => {
      void worker.terminate();
      reject(new Error("heic timeout"));
    }, 180_000);
    worker.once("message", (message: { width: number; height: number; data: Uint8Array; error?: string }) => {
      clearTimeout(timer);
      void worker.terminate();
      if (message.error) reject(new Error(message.error));
      else resolve(message);
    });
    worker.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

/**
 * Decode (HEIC/HEIF through heic-decode on a worker thread), honor EXIF rotation, crop, resize and re-encode as WebP.
 * GIFs keep only their first frame.
 */
export async function processImage(input: Uint8Array, kind: ImageKind, crop: Crop | null) {
  const format = sniffImage(input);
  if (!format) throw new Error("unsupported");
  const sharp = (await import("sharp")).default;
  sharp.concurrency(1);
  const oriented =
    format === "heic"
      ? await (async () => {
          const raw = await decodeHeic(input);
          return sharp(raw.data, { raw: { width: raw.width, height: raw.height, channels: 4 } }).png({ compressionLevel: 0 }).toBuffer({ resolveWithObject: true });
        })()
      : await sharp(Buffer.from(input), { animated: false, limitInputPixels: 80_000_000 }).rotate().toBuffer({ resolveWithObject: true });
  const { width, height } = oriented.info;
  const target = IMAGE_TARGET[kind];
  let pipeline = sharp(oriented.data);
  const area = crop ?? (target.aspect ? centerCrop(width, height, target.aspect) : null);
  if (area) pipeline = pipeline.extract(cropRect(area, width, height));
  pipeline = target.aspect
    ? pipeline.resize(target.width, target.height, { fit: "cover" })
    : pipeline.resize(target.width, target.height, { fit: "inside", withoutEnlargement: true });
  const out = await pipeline.webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  return { bytes: out.data, width: out.info.width, height: out.info.height, contentType: "image/webp", sizeBytes: out.data.byteLength };
}

export function memberImageUrl(id: string | null | undefined): string | null {
  return id ? `/api/member-images/${id}` : null;
}
