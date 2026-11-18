import { COI_MAX_BYTES, coiType } from "@/lib/trades";
import { validatePolicies } from "@/lib/insurance-compliance";

export const COI_ERROR = "Attach a certificate of insurance up to 10 MB (PDF, JPG or PNG).";

export async function readCertificate(form: FormData) {
  const file = form.get("coi");
  if (!(file instanceof File) || file.size === 0) return { ok: true, file: null } as const;
  if (file.size > COI_MAX_BYTES) return { ok: false, error: COI_ERROR } as const;
  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType = coiType(bytes);
  if (!contentType) return { ok: false, error: COI_ERROR } as const;
  const fileName = file.name.replace(/[^\w .()-]/g, "_").slice(0, 160) || "certificate-of-insurance";
  return { ok: true, file: { fileName, contentType, sizeBytes: bytes.length, bytes, uploadedAt: new Date() } } as const;
}

export function readInsurance(form: FormData) {
  const read = (name: string, length: number) => String(form.get(name) ?? "").trim().slice(0, length);
  const types = form.getAll("policyType");
  const dates = form.getAll("policyExpiration");
  const names = form.getAll("policyOtherName");
  const limits = form.getAll("policyLimit");
  const aggregates = form.getAll("policyAggregate");
  const rows = Array.from({ length: Math.max(types.length, dates.length, names.length, limits.length, aggregates.length) }, (_, i) => ({
    type: String(types[i] ?? ""), expiresKey: String(dates[i] ?? ""), otherName: String(names[i] ?? ""),
    limit: String(limits[i] ?? ""), aggregate: String(aggregates[i] ?? ""),
  }));
  return {
    agent: {
      insuranceAgentName: read("insuranceAgentName", 120),
      insuranceAgentEmail: read("insuranceAgentEmail", 254),
      insuranceAgentPhone: read("insuranceAgentPhone", 60),
    },
    result: validatePolicies(rows),
  };
}

export function insuranceFromJoin(profile: unknown) {
  if (!profile || typeof profile !== "object" || !("insuranceProfile" in profile)) return null;
  const stored = profile.insuranceProfile;
  if (!stored || typeof stored !== "object") return null;
  const data = stored as Record<string, unknown>;
  const read = (value: unknown) => typeof value === "string" ? value : "";
  const rows = Array.isArray(data.policies) ? data.policies.map((row) => ({
    type: read(row?.type), expiresKey: read(row?.expiresKey), otherName: read(row?.otherName),
    limit: typeof row?.limitAmount === "number" ? row.limitAmount : 0,
    aggregate: typeof row?.aggregateAmount === "number" ? row.aggregateAmount : 0,
  })) : [];
  // Applications sent before limits were required (Nov 17 evening) still carry their dated policies over.
  const result = validatePolicies(rows, { requireLimit: false });
  return {
    agent: {
      insuranceAgentName: read(data.insuranceAgentName),
      insuranceAgentEmail: read(data.insuranceAgentEmail),
      insuranceAgentPhone: read(data.insuranceAgentPhone),
    },
    policies: result.ok ? result.policies : [],
  };
}
