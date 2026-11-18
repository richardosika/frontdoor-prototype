"use client";

import { useTx } from "@/components/locale-context";

export function ModeratorNotice() {
  const tx = useTx();
  return (
    <p className="text-[11px] leading-relaxed text-mut">
      {tx("Moderators can read messages for safety and verification. Opening a conversation in moderation is logged.")}
    </p>
  );
}
