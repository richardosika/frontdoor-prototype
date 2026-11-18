import { prisma } from "@/lib/prisma";
import { gettingStarted, isDeveloperRole } from "@/lib/member-reach";

type GateUser = {
  id: string;
  role: string;
  isAdmin?: boolean;
  markets: string;
  lookingFor: string;
  offering: string;
  bio: string;
  ndaAcceptedAt: Date | null;
  photoId: string | null;
  licenses?: string | null;
  extraCategories?: string | null;
};

/**
 * Nov 5: for every member type except developers, opportunities and connections stay hidden until each Getting
 * started step before the first outreach is done (the outreach step itself needs the opportunities to be visible).
 */
export async function startLocked(user: GateUser): Promise<boolean> {
  if (user.isAdmin || isDeveloperRole(user.role)) return false;
  const projectCount = await prisma.trackProject.count({ where: { userId: user.id } });
  const items = gettingStarted({
    role: user.role,
    extraCategories: user.extraCategories,
    profileDone: user.markets.trim().length > 1 && (user.lookingFor.trim().length > 1 || user.offering.trim().length > 1 || user.bio.trim().length > 1),
    ndaAccepted: Boolean(user.ndaAcceptedAt),
    projectCount,
    seekingSet: false,
    approvedProject: false,
    outreachSent: 0,
    hasPhoto: Boolean(user.photoId),
    hasCredential: Boolean(user.licenses?.trim()),
  });
  return items.some((item) => item.id !== "reach" && !item.done);
}
