import { projectAccessible } from "@/lib/member-reach";
import { projectDetailsVisible } from "@/lib/project-contact";

export type ProjectPageView = "owner" | "full" | "basic" | "hidden";

/**
 * What a viewer sees on a project page. Owner: everything plus editing. Staff, or the owner's circle when the
 * project is shared: full details. Members in a category the project seeks: basics and what it is seeking.
 * Everyone else (not sought, not in the owner's circle) sees nothing: "Project not available".
 */
export function projectPageView(
  project: { userId: string; reviewStatus: string; shareWithCircle: boolean; seeking?: string },
  viewer: { id: string; isAdmin: boolean; inOwnerCircle: boolean; role?: string; teamCandidate?: boolean },
): ProjectPageView {
  if (project.userId === viewer.id) return "owner";
  if (!projectAccessible({ ...project, seeking: project.seeking ?? "" }, { ...viewer, role: viewer.role ?? "" })) return "hidden";
  return projectDetailsVisible(project, viewer) ? "full" : "basic";
}
