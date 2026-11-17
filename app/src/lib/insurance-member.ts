import { insuranceComplete } from "@/lib/insurance-compliance";
import { prisma } from "@/lib/prisma";

export const insuranceMemberSelect = {
  id: true,
  name: true,
  insuranceAgentName: true,
  insuranceAgentEmail: true,
  insuranceAgentPhone: true,
  insuranceCertificate: { select: { fileName: true, uploadedAt: true } },
  insurancePolicies: { orderBy: { expiresOn: "asc" as const } },
} as const;

export function memberInsuranceComplete(member: {
  insuranceCertificate: object | null;
  insuranceAgentEmail: string;
  insuranceAgentPhone: string;
}) {
  return insuranceComplete({
    hasCoi: Boolean(member.insuranceCertificate),
    agentEmail: member.insuranceAgentEmail,
    agentPhone: member.insuranceAgentPhone,
  });
}

export function loadMemberInsurance(id: string) {
  return prisma.user.findUnique({ where: { id }, select: insuranceMemberSelect });
}
