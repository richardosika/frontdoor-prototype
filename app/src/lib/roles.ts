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
  "SUBCONTRACTOR",
  "OTHER_PROFESSIONAL",
] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export type RoleDef = {
  id: RoleId;
  /** A person's role, singular (e.g. on a member badge). Same words as the category name. */
  label: string;
  /** Nov 5: the category name, plural Title Case, identical on the join form, the public site and everywhere else. */
  category: string;
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
    category: "Developers",
    group: "Capital",
    blurb: "Raising capital or seeking partners",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Entity good standing, deeds, and permit history",
  },
  {
    id: "INVESTOR_PE",
    label: "LP & Investor",
    category: "LPs & Investors",
    group: "Capital",
    blurb: "Accredited individual, fund, or PE firm",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Accredited-investor attestation and entity records",
  },
  {
    id: "FAMILY_OFFICE",
    label: "Family Office",
    category: "Family Offices",
    group: "Capital",
    blurb: "Private capital investing directly",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Entity records and principal identity",
  },
  {
    id: "LENDER",
    label: "Lender & Debt Fund",
    category: "Lenders & Debt Funds",
    group: "Capital",
    blurb: "Bridge, construction, and permanent debt",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Lender public records",
  },
  {
    id: "MORTGAGE_BROKER",
    label: "Mortgage Broker",
    category: "Mortgage Brokers",
    group: "Capital",
    blurb: "Places loans for borrowers",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Mortgage broker public records",
  },
  {
    id: "GENERAL_CONTRACTOR",
    label: "General Contractor",
    category: "General Contractors",
    group: "Build and Design",
    blurb: "Builds the project",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Contractor registration, insurance, and bonding",
  },
  {
    id: "ARCHITECT_ENGINEER",
    label: "Architect",
    category: "Architects",
    group: "Build and Design",
    blurb: "Design, entitlements, and engineering",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Design-professional public records",
  },
  {
    id: "RE_ATTORNEY",
    label: "Real Estate Attorney",
    category: "Real Estate Attorneys",
    group: "Legal",
    blurb: "Closings, leases, and transactions",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Bar standing on the public record",
  },
  {
    id: "SECURITIES_ATTORNEY",
    label: "Securities Attorney",
    category: "Securities Attorneys",
    group: "Legal",
    blurb: "Offerings, fund formation, compliance",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Bar standing and disciplinary record",
  },
  {
    id: "ZONING_ATTORNEY",
    label: "Zoning & Land Use Attorney",
    category: "Zoning & Land Use Attorneys",
    group: "Legal",
    blurb: "Entitlements, variances, land use",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Bar standing and land-use record",
  },
  {
    id: "INSURANCE",
    label: "Insurer",
    category: "Insurers",
    group: "Insurance",
    blurb: "Builder's risk, liability, and project coverage",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Producer public records and carrier appointments",
  },
  {
    id: "BROKER",
    label: "Real Estate Broker",
    category: "Real Estate Brokers",
    group: "Services",
    blurb: "Sales, leasing, and capital advisory",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Brokerage public records",
  },
  {
    id: "APPRAISER",
    label: "Appraiser",
    category: "Appraisers",
    group: "Services",
    blurb: "Valuation and appraisal reports",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Appraiser public records",
  },
  {
    id: "PROPERTY_MANAGER",
    label: "Property Manager",
    category: "Property Managers",
    group: "Services",
    blurb: "Operations and asset management",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Management entity records",
  },
  {
    id: "ACCOUNTANT",
    label: "Accountant & Cost Segregation",
    category: "Accountants & Cost Segregation",
    group: "Services",
    blurb: "Tax, audit, and cost segregation",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Accounting-firm public records",
  },
  {
    id: "EXCHANGE_1031",
    label: "1031 Exchange Intermediary",
    category: "1031 Exchange Intermediaries",
    group: "Services",
    blurb: "Qualified intermediary for exchanges",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Entity records, fidelity bond, and coverage on file",
  },
  {
    id: "SURVEYOR",
    label: "Surveyor",
    category: "Surveyors",
    group: "Build and Design",
    blurb: "Boundary, topographic, and ALTA surveys",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Land surveyor public records",
  },
  {
    id: "TITLE_COMPANY",
    label: "Title Company",
    category: "Title Companies",
    group: "Services",
    blurb: "Title search, commitments, and closings",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Title agency records and underwriter appointments",
  },
  {
    id: "ENVIRONMENTAL_CONSULTANT",
    label: "Environmental Consultant",
    category: "Environmental Consultants",
    group: "Build and Design",
    blurb: "Phase I / II site assessments and remediation",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Environmental firm records",
  },
  {
    id: "GEOTECH_ENGINEER",
    label: "Geotechnical Engineer",
    category: "Geotechnical Engineers",
    group: "Build and Design",
    blurb: "Soil borings, foundations, and site reports",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Professional engineer public records",
  },
  {
    id: "CIVIL_ENGINEER",
    label: "Civil Engineer",
    category: "Civil Engineers",
    group: "Build and Design",
    blurb: "Site plans, grading, drainage, and utilities",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Professional engineer public records",
  },
  {
    id: "STRUCTURAL_ENGINEER",
    label: "Structural Engineer",
    category: "Structural Engineers",
    group: "Build and Design",
    blurb: "Structural design and inspections",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Professional engineer public records",
  },
  {
    id: "PERMIT_EXPEDITER",
    label: "Permit Expediter",
    category: "Permit Expediters",
    group: "Build and Design",
    blurb: "Building permits and municipal approvals",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Business records",
  },
  {
    id: "MEP_ENGINEER",
    label: "MEP Engineer",
    category: "MEP Engineers",
    group: "Build and Design",
    blurb: "Mechanical, electrical, and plumbing design",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Professional engineer public records",
  },
  {
    id: "SURETY_BONDING",
    label: "Surety & Bonding",
    category: "Sureties & Bonding",
    group: "Insurance",
    blurb: "Performance, payment, and bid bonds",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Surety producer records and carrier appointments",
  },
  {
    id: "SUBCONTRACTOR",
    label: "Subcontractor",
    category: "Subcontractors",
    group: "Build and Design",
    blurb: "Trade work for general contractors and developers",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Contractor registration, insurance, and trade records",
  },
  {
    id: "OTHER_PROFESSIONAL",
    label: "Other Deal Professional",
    category: "Other Deal Professionals",
    group: "Services",
    blurb: "Another role on a real estate deal team",
    credentialLabel: CARD,
    credentialPlaceholder: CARD_PLACEHOLDER,
    check: "Business records",
  },
];

/** Nov 5: the category name (plural Title Case) for a role id. */
export function roleCategory(id: string | null | undefined): string {
  return roleById(id)?.category ?? "Other Deal Professionals";
}

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
