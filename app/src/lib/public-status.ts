/** The public status page. /apply/status/<token> redirects here. */
export function publicStatusPath(token: string): string {
  return `/request-status/${encodeURIComponent(token)}`;
}
