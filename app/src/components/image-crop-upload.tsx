"use client";

import { useEffect, useRef, useState } from "react";

export type CropLabels = { choose: string; zoom: string; drag: string; noPreview: string; save: string; caption?: string };

/**
 * File picker with a simple crop step: drag to position, slider to zoom. Sends the original file plus the crop as
 * fractions; the server converts (HEIC included), crops and resizes. Without an aspect, the whole image is kept.
 */
export function ImageCropUpload({
  action,
  kind,
  aspect,
  accept,
  labels,
}: {
  action: (formData: FormData) => void | Promise<void>;
  kind: "AVATAR" | "COVER" | "GALLERY";
  aspect: number | null;
  accept: string;
  labels: CropLabels;
}) {
  const [url, setUrl] = useState("");
  const [broken, setBroken] = useState(false);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 });
  const [frameW, setFrameW] = useState(320);
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const measure = () => setFrameW(frame.current?.clientWidth || 320);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [url]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);

  const frameH = aspect ? frameW / aspect : 0;
  const scale = natural.w && aspect ? Math.max(frameW / natural.w, frameH / natural.h) * zoom : 0;
  const w = scale ? Math.min(1, frameW / (natural.w * scale)) : 1;
  const h = scale ? Math.min(1, frameH / (natural.h * scale)) : 1;
  const x = Math.min(Math.max(center.x - w / 2, 0), 1 - w);
  const y = Math.min(Math.max(center.y - h / 2, 0), 1 - h);
  const crop = aspect && scale && !broken ? JSON.stringify({ x, y, w, h }) : "";

  return (
    <form action={action} className="grid min-w-0 gap-3" data-testid={`upload-${kind.toLowerCase()}`}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="crop" value={crop} />
      <label className="block min-w-0">
        <span className="mb-1.5 block font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-mut">{labels.choose}</span>
        <input
          name="file"
          type="file"
          accept={accept}
          required
          className="block w-full min-w-0 text-[15px]"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setBroken(false);
            setZoom(1);
            setCenter({ x: 0.5, y: 0.5 });
            setNatural({ w: 0, h: 0 });
            setUrl(file ? URL.createObjectURL(file) : "");
          }}
        />
      </label>
      {url && broken ? <p className="text-[14px] text-mut">{labels.noPreview}</p> : null}
      {url && !broken ? (
        aspect ? (
          <div className="grid gap-2">
            <div
              ref={frame}
              className={`relative w-full touch-none select-none overflow-hidden border border-brass bg-cream ${kind === "AVATAR" ? "max-w-[280px] rounded-full" : "rounded"}`}
              style={{ height: frameH || undefined, aspectRatio: aspect ? String(aspect) : undefined }}
              onPointerDown={(event) => {
                drag.current = { x: event.clientX, y: event.clientY };
                (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!drag.current || !scale) return;
                const dx = event.clientX - drag.current.x;
                const dy = event.clientY - drag.current.y;
                drag.current = { x: event.clientX, y: event.clientY };
                setCenter((value) => ({
                  x: Math.min(Math.max(value.x - dx / (natural.w * scale), w / 2), 1 - w / 2),
                  y: Math.min(Math.max(value.y - dy / (natural.h * scale), h / 2), 1 - h / 2),
                }));
              }}
              onPointerUp={() => (drag.current = null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                draggable={false}
                onLoad={(event) => setNatural({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })}
                onError={() => setBroken(true)}
                className="pointer-events-none absolute max-w-none"
                style={scale ? { width: natural.w * scale, height: natural.h * scale, left: -x * natural.w * scale, top: -y * natural.h * scale } : { opacity: 0 }}
              />
            </div>
            <p className="text-[13px] text-mut">{labels.drag}</p>
            <label className="flex items-center gap-3 text-[14px] text-ink">
              {labels.zoom}
              <input type="range" min={1} max={4} step={0.05} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-forest" />
            </label>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" onError={() => setBroken(true)} className="max-h-60 w-auto max-w-full rounded border border-line object-contain" />
        )
      ) : null}
      {labels.caption ? (
        <input name="caption" maxLength={200} placeholder={labels.caption} className="min-h-11 w-full rounded-sm border border-line bg-paper px-3 text-[16px]" />
      ) : null}
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-sm bg-forest px-4 py-[11px] font-sans text-[14px] font-semibold tracking-[0.08em] text-paper [font-variant:all-small-caps]"
        type="submit"
      >
        {labels.save}
      </button>
    </form>
  );
}
