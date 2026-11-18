import { insuranceComplete, insuranceStatus } from "@/lib/insurance-compliance";
import { prisma } from "@/lib/prisma";

export const insuranceMemberSelect = {
  id: true,
  name: true,
  insuranceAgentName: true,
  insuranceAgentEmail: true,
  insuranceAgentPhone: true,
  role: true,
  extraCategories: true,
  insuranceSuspendedAt: true,
  insuranceSuspensionLiftedAt: true,
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

export function memberInsuranceStatus(member: Parameters<typeof memberInsuranceComplete>[0] & { insurancePolicies: readonly unknown[]; insuranceSuspendedAt?: Date | null }) {
  return insuranceStatus({ complete: memberInsuranceComplete(member), policyCount: member.insurancePolicies.length, suspended: Boolean(member.insuranceSuspendedAt) });
}

export function loadMemberInsurance(id: string) {
  return prisma.user.findUnique({ where: { id }, select: insuranceMemberSelect });
}
