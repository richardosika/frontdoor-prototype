import { roleLabel, roleShort } from "@/lib/roles";

/** #37: the line under a member's name on every card: "Company · Member type · City". Company is left out when empty. */
export function memberLine(member: { org?: string | null; role?: string | null; location?: string | null }, tx: (text: string) => string = (t) => t): string {
  return [member.org?.trim(), member.role ? tx(roleShort(roleLabel(member.role))) : "", member.location?.trim()].filter(Boolean).join(" · ");
}
