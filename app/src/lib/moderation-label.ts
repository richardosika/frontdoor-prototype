const ACTION_LABELS: Record<string, string> = {
  DELETE_INVITE_REQUEST: "Delete request to join",
};

/** Shown in place of a stored moderation action. The stored value stays unchanged. */
export function moderationActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
