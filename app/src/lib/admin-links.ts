/** Direct link line for admin decision emails, so "open the application" is one click. */
export function applicationLinkLine(base: string, applicationId: string): string {
  return `Open the application: ${base.replace(/\/+$/, "")}/admin/applications/${applicationId}`;
}
