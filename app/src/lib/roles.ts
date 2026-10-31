export const GROUPS = ["Capital", "Build and Design", "Legal", "Insurance", "Services"] as const;

export type RoleGroup = (typeof GROUPS)[number];

export const ROLE_IDS = [
  "DEVELOPER",
  "INVESTOR_PE",
  "FAMILY_OFFICE",
  "LENDER",
  "MORTGAGE_BROKER",
  "GENERAL_CONTRACTOR",
  "ARCHITECT_ENGINEER",
  "RE_ATTORNEY",
  "SECURITIES_ATTORNEY",
  "ZONING_ATTORNEY",
  "INSURANCE",
  "BROKER",
  "APPRAISER",
  "PROPERTY_MANAGER",
  "ACCOUNTANT",
  "EXCHANGE_1031",
  "SURVEYOR",
  "TITLE_COMPANY",
  "ENVIRONMENTAL_CONSULTANT",
  "GEOTECH_ENGINEER",
  "CIVIL_ENGINEER",
  "STRUCTURAL_ENGINEER",
  "PERMIT_EXPEDITER",
  "MEP_ENGINEER",
  "SURETY_BONDING",
] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export type RoleDef = {
  id: RoleId;
  label: string;
  group: RoleGroup;
  blurb: string;
  credentialLabel: string;
  credentialPlaceholder: string;
  check: string;
};

const CARD = "Business card";
const CARD_PLACEHOLDER = "Optional JPG, PNG, or PDF";

export const ROLES: RoleDef[] = [
  {
    id: "DEVELOPER",
    label: "Developer",
    group: "Capital",
    blurb: "Raising capital or seeking partners",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Entity good standing, deeds, and permit history",
  },
  {
    id: "INVESTOR_PE",
    label: "Investor / Private Equity",
    group: "Capital",
    blurb: "Accredited individual, fund, or PE firm",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Accredited-investor attestation and entity records",
  },
  {
    id: "FAMILY_OFFICE",
    label: "Family Office",
    group: "Capital",
    blurb: "Private capital investing directly",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Entity records and principal identity",
  },
  {
    id: "LENDER",
    label: "Lender / Debt Fund",
    group: "Capital",
    blurb: "Bridge, construction, and permanent debt",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Lender public records",
  },
  {
    id: "MORTGAGE_BROKER",
    label: "Mortgage Broker",
    group: "Capital",
    blurb: "Places loans for borrowers",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Mortgage broker public records",
  },
  {
    id: "GENERAL_CONTRACTOR",
    label: "General Contractor",
    group: "Build and Design",
    blurb: "Builds the project",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Contractor registration, insurance, and bonding",
  },
  {
    id: "ARCHITECT_ENGINEER",
    label: "Architect / Engineer",
    group: "Build and Design",
    blurb: "Design, entitlements, and engineering",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Design-professional public records",
  },
  {
    id: "RE_ATTORNEY",
    label: "Real Estate Attorney",
    group: "Legal",
    blurb: "Closings, leases, and transactions",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Bar standing on the public record",
  },
  {
    id: "SECURITIES_ATTORNEY",
    label: "Securities Attorney",
    group: "Legal",
    blurb: "Offerings, fund formation, compliance",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Bar standing and disciplinary record",
  },
  {
    id: "ZONING_ATTORNEY",
    label: "Zoning / Land Use Attorney",
    group: "Legal",
    blurb: "Entitlements, variances, land use",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Bar standing and land-use record",
  },
  {
    id: "INSURANCE",
    label: "Insurance (builder's risk, liability)",
    group: "Insurance",
    blurb: "Builder's risk, liability, and project coverage",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Producer public records and carrier appointments",
  },
  {
    id: "BROKER",
    label: "Broker",
    group: "Services",
    blurb: "Sales, leasing, and capital advisory",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Brokerage public records",
  },
  {
    id: "APPRAISER",
    label: "Appraiser",
    group: "Services",
    blurb: "Valuation and appraisal reports",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Appraiser public records",
  },
  {
    id: "PROPERTY_MANAGER",
    label: "Property Manager",
    group: "Services",
    blurb: "Operations and asset management",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Management entity records",
  },
  {
    id: "ACCOUNTANT",
    label: "Accountant / Cost Seg",
    group: "Services",
    blurb: "Tax, audit, and cost segregation",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Accounting-firm public records",
  },
  {
    id: "EXCHANGE_1031",
    label: "1031 Exchange Intermediary",
    group: "Services",
    blurb: "Qualified intermediary for exchanges",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Entity records, fidelity bond, and coverage on file",
  },
  {
    id: "SURVEYOR",
    label: "Surveyor",
    group: "Build and Design",
    blurb: "Boundary, topographic, and ALTA surveys",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Land surveyor public records",
  },
  {
    id: "TITLE_COMPANY",
    label: "Title Company",
    group: "Services",
    blurb: "Title search, commitments, and closings",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Title agency records and underwriter appointments",
  },
  {
    id: "ENVIRONMENTAL_CONSULTANT",
    label: "Environmental Consultant",
    group: "Build and Design",
    blurb: "Phase I / II site assessments and remediation",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Environmental firm records",
  },
  {
    id: "GEOTECH_ENGINEER",
    label: "Geotechnical Engineer",
    group: "Build and Design",
    blurb: "Soil borings, foundations, and site reports",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Professional engineer public records",
  },
  {
    id: "CIVIL_ENGINEER",
    label: "Civil Engineer",
    group: "Build and Design",
    blurb: "Site plans, grading, drainage, and utilities",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Professional engineer public records",
  },
  {
    id: "STRUCTURAL_ENGINEER",
    label: "Structural Engineer",
    group: "Build and Design",
    blurb: "Structural design and inspections",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Professional engineer public records",
  },
  {
    id: "PERMIT_EXPEDITER",
    label: "Permit Expediter",
    group: "Build and Design",
    blurb: "Building permits and municipal approvals",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Business records",
  },
  {
    id: "MEP_ENGINEER",
    label: "MEP Engineer",
    group: "Build and Design",
    blurb: "Mechanical, electrical, and plumbing design",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Professional engineer public records",
  },
  {
    id: "SURETY_BONDING",
    label: "Surety / Bonding",
    group: "Insurance",
    blurb: "Performance, payment, and bid bonds",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Surety producer records and carrier appointments",
  },
];

export function roleById(id: string | null | undefined): RoleDef | undefined {
  return ROLES.find((role) => role.id === id);
}

export function roleLabel(id: string | null | undefined): string {
  return roleById(id)?.label ?? "Member";
}

export function roleShort(label: string): string {
  return label.replace(/ \(.*\)$/, "");
}

export function isRoleId(value: string): value is RoleId {
  return (ROLE_IDS as readonly string[]).includes(value);
}
