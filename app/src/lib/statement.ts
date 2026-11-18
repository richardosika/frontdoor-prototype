import { formatAuditTime } from "@/lib/format";

export type MemberReply = { at: string; text: string; label: string };

const REPLY_MARK = "\n\nMember reply (";

/** Track record stays the original statement. Replies stay attached for the admin attention count. */
export function splitMemberReply(statement: string): { track: string; replies: MemberReply[] } {
  const parts = statement.split(/\n\nMember reply \(([^)]+)\):\n/);
  const track = (parts[0] || "").trim();
  const replies: MemberReply[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const at = parts[i] || "";
    const text = (parts[i + 1] || "").trim();
    replies.push({ at, text, label: replyStampLabel(at) });
  }
  return { track, replies };
}

export function replyStampLabel(stamp: string): string {
  const date = new Date(stamp);
  if (Number.isNaN(date.getTime())) return stamp;
  return formatAuditTime(date);
}

export function appendMemberReply(statement: string, note: string, at = new Date()): string {
  return `${statement.trim()}${REPLY_MARK}${at.toISOString()}):\n${note}`.slice(0, 4000);
}
