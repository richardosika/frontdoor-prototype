"use client";

import { useEffect, useRef } from "react";

export function Banner({ error, notice }: { error?: string; notice?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!error && !notice) return;
    ref.current?.scrollIntoView({ block: "center" });
  }, [error, notice]);
  if (error) {
    return (
      <p ref={ref} className="mb-4 rounded border border-brass bg-brass-soft px-3 py-2 text-sm text-forest">
        {error}
      </p>
    );
  }
  if (notice) {
    return (
      <p ref={ref} className="mb-4 rounded border border-line bg-paper px-3 py-2 text-sm text-ink">
        {notice}
      </p>
    );
  }
  return null;
}
