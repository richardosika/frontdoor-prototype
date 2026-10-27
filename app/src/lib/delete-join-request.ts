import { deleteOutboxTied } from "@/lib/remove-member";
import { prisma } from "@/lib/prisma";

/** Removes a request to join and the rows that would recreate its CRM person. */
export async function deleteJoinRequest(request: { id: string; email: string; statusToken: string }) {
  await prisma.$transaction(async (tx) => {
    await tx.verificationCase.deleteMany({ where: { inviteRequestId: request.id } });
    await deleteOutboxTied(tx, [request.email], {
      tokens: [request.statusToken, `/request-status/${request.statusToken}`],
    });
    await tx.crmPerson.deleteMany({
      where: {
        OR: [
          { inviteRequestId: request.id },
          { email: request.email, applicationId: null, userId: null },
        ],
      },
    });
    await tx.inviteRequest.delete({ where: { id: request.id } });
  });
}
