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

export const ROLES: RoleDef[] = [
  {
    id: "DEVELOPER",
    label: "Developer",
    group: "Capital",
    blurb: "Raising capital or seeking partners",
    credentialLabel: "Entity / project reference",
    credentialPlaceholder: "Hale Row Partners LLC · NJ entity no.",
    check: "Entity good standing, deeds and permit history",
  },
  {
    id: "INVESTOR_PE",
    label: "Investor / Private Equity",
    group: "Capital",
    blurb: "Accredited individual, fund, or PE firm",
    credentialLabel: "Fund / entity name",
    credentialPlaceholder: "Nguyen Capital LP",
    check: "Accredited-investor attestation and entity records",
  },
  {
    id: "FAMILY_OFFICE",
    label: "Family Office",
    group: "Capital",
    blurb: "Private capital investing directly",
    credentialLabel: "Entity name",
    credentialPlaceholder: "Kim Family Office LLC",
    check: "Entity records, principal identity, accredited attestation",
  },
  {
    id: "LENDER",
    label: "Lender / Debt Fund",
    group: "Capital",
    blurb: "Bridge, construction, and permanent debt",
    credentialLabel: "Lender license / NMLS ID",
    credentialPlaceholder: "NJ lender license · NMLS ID 000000",
    check: "State lender license and NMLS lookup",
  },
  {
    id: "MORTGAGE_BROKER",
    label: "Mortgage Broker",
    group: "Capital",
    blurb: "Places loans for borrowers",
    credentialLabel: "NMLS ID",
    credentialPlaceholder: "NMLS ID 000000",
    check: "NMLS ID and state mortgage broker license lookup",
  },
  {
    id: "GENERAL_CONTRACTOR",
    label: "General Contractor",
    group: "Build and Design",
    blurb: "Builds the project",
    credentialLabel: "State contractor license / registration",
    credentialPlaceholder: "NJ-GC-000000",
    check: "Contractor license, insurance, and bonding on file",
  },
  {
    id: "ARCHITECT_ENGINEER",
    label: "Architect / Engineer",
    group: "Build and Design",
    blurb: "Design, entitlements, and engineering",
    credentialLabel: "State license number",
    credentialPlaceholder: "NJ architect license no. 00000000",
    check: "State licensing board lookup and active status",
  },
  {
    id: "RE_ATTORNEY",
    label: "Real Estate Attorney",
    group: "Legal",
    blurb: "Closings, leases, and transactions",
    credentialLabel: "State bar admission",
    credentialPlaceholder: "NJ Bar ID 000000000",
    check: "Bar admission and good standing via state bar lookup",
  },
  {
    id: "SECURITIES_ATTORNEY",
    label: "Securities Attorney",
    group: "Legal",
    blurb: "Offerings, fund formation, compliance",
    credentialLabel: "State bar admission",
    credentialPlaceholder: "NY Bar reg. no. 0000000",
    check: "Bar admission and standing; SEC / FINRA disciplinary check",
  },
  {
    id: "ZONING_ATTORNEY",
    label: "Zoning / Land Use Attorney",
    group: "Legal",
    blurb: "Entitlements, variances, land use",
    credentialLabel: "State bar admission",
    credentialPlaceholder: "NJ Bar ID 000000000",
    check: "Bar admission and standing; land-use appearances reviewed",
  },
  {
    id: "INSURANCE",
    label: "Insurance (builder's risk, title, surety / bonding)",
    group: "Insurance",
    blurb: "Builder's risk, title, surety / bonding",
    credentialLabel: "Producer / insurer license no.",
    credentialPlaceholder: "NJ producer license no. 0000000",
    check: "State insurance license lookup and surety carrier appointments",
  },
  {
    id: "BROKER",
    label: "Broker",
    group: "Services",
    blurb: "Sales, leasing, and capital advisory",
    credentialLabel: "Real estate broker license",
    credentialPlaceholder: "NJ broker license no. 0000000",
    check: "State real estate license lookup",
  },
  {
    id: "APPRAISER",
    label: "Appraiser",
    group: "Services",
    blurb: "Valuation and appraisal reports",
    credentialLabel: "State appraiser certification",
    credentialPlaceholder: "NJ Certified General no. 00000",
    check: "State appraiser board and ASC registry lookup",
  },
  {
    id: "PROPERTY_MANAGER",
    label: "Property Manager",
    group: "Services",
    blurb: "Operations and asset management",
    credentialLabel: "Management license / entity no.",
    credentialPlaceholder: "Entity no. · NJ broker license",
    check: "Entity records, license where required, owner references",
  },
  {
    id: "ACCOUNTANT",
    label: "Accountant / Cost Seg",
    group: "Services",
    blurb: "Tax, audit, and cost segregation",
    credentialLabel: "CPA license / firm",
    credentialPlaceholder: "NJ CPA license no. 00000",
    check: "State CPA board license lookup",
  },
  {
    id: "EXCHANGE_1031",
    label: "1031 Exchange Intermediary",
    group: "Services",
    blurb: "Qualified intermediary for exchanges",
    credentialLabel: "Entity no. · bond / E&O details",
    credentialPlaceholder: "Entity no. · fidelity bond · E&O",
    check: "Entity records, fidelity bond, and E&O coverage on file",
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
