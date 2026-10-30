"use client";

import { useState } from "react";
import { btnOutline } from "@/components/ui";
import { useTx } from "@/components/locale-context";

export function ShareLink({ href }: { href: string }) {
  const tx = useTx();
  const [label, setLabel] = useState("Copy link");
  return (
    <button
      type="button"
      className={btnOutline}
      onClick={async () => {
        const url = `${window.location.origin}${href}`;
        try {
          await navigator.clipboard.writeText(url);
          setLabel("Copied");
        } catch {
          setLabel("Select the link above");
        }
      }}
    >
      {tx(label)}
    </button>
  );
}
