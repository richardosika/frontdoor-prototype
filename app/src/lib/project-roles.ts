import { ROLES } from "@/lib/roles";

/** Your role on a project: the platform roles, plus Other. */
export const PROJECT_ROLE_LABELS: string[] = [...ROLES.map((role) => role.label), "Other"];
