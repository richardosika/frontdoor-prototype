/**
 * Overnight: profile fields that fit each member type. One set of columns on User, labelled per role:
 * licenses (credential), typicalJobSize (size range / check size), specialties (role list), markets (service area).
 */
export type RoleProfile = {
  credential: string;
  credentialHint: string;
  size: string;
  sizeHint: string;
  specialties: string;
  specialtiesHint: string;
  insurance: boolean;
  privateTerms: boolean;
  /** Getting started: the profile step counts as done only with a credential for these roles. */
  credentialRequired: boolean;
  portfolio: string;
};

const PE: RoleProfile = {
  credential: "Professional engineer license",
  credentialHint: "State and number, e.g. NJ PE 24GE05512300",
  size: "Typical project size",
  sizeHint: "e.g. 20 to 200 units",
  specialties: "Services",
  specialtiesHint: "e.g. podium structures, retrofit, inspections",
  insurance: true,
  privateTerms: false,
  credentialRequired: true,
  portfolio: "Add a past project to show your work",
};

const BASE: RoleProfile = {
  credential: "Licenses",
  credentialHint: "",
  size: "Typical job size",
  sizeHint: "$2M to $20M",
  specialties: "Services",
  specialtiesHint: "",
  insurance: false,
  privateTerms: false,
  credentialRequired: false,
  portfolio: "Add a past project to show your work",
};

export const ROLE_PROFILES: Record<string, Partial<RoleProfile>> = {
  LENDER: { credential: "Lender license or registration", credentialHint: "e.g. NJ Residential Mortgage Lender, or exempt", size: "Loan size range", sizeHint: "e.g. $3M to $40M", specialties: "Loan types", specialtiesHint: "e.g. construction, bridge, permanent, mezzanine", privateTerms: true, portfolio: "Add a loan you closed (past project)" },
  MORTGAGE_BROKER: { credential: "NMLS number", credentialHint: "Individual and company NMLS IDs", size: "Loan size range", sizeHint: "e.g. $1M to $25M", specialties: "Loan types", specialtiesHint: "e.g. construction, DSCR, bridge, SBA", privateTerms: true, credentialRequired: true, portfolio: "Add a loan you placed (past project)" },
  INVESTOR_PE: { credential: "Accreditation", credentialHint: "e.g. accredited investor, QP", size: "Check size", sizeHint: "e.g. $500K to $5M", specialties: "Asset preferences", specialtiesHint: "e.g. multifamily, industrial; value-add", portfolio: "Add a past investment (past project)" },
  FAMILY_OFFICE: { credential: "Accreditation", credentialHint: "e.g. accredited investor, QP", size: "Check size", sizeHint: "e.g. $1M to $15M", specialties: "Asset preferences", specialtiesHint: "e.g. ground-up multifamily, long hold", portfolio: "Add a past investment (past project)" },
  DEVELOPER: { credential: "Licenses", size: "Typical project size", specialties: "Focus" },
  GENERAL_CONTRACTOR: { credential: "Contractor license", credentialHint: "State, type and number", size: "Typical job size", sizeHint: "$5M to $40M", specialties: "Self-perform trades", specialtiesHint: "e.g. concrete, framing, drywall", insurance: true, credentialRequired: true },
  ARCHITECT_ENGINEER: { ...PE, credential: "Architect or engineer license", credentialHint: "State and number" },
  STRUCTURAL_ENGINEER: PE,
  CIVIL_ENGINEER: { ...PE, specialtiesHint: "e.g. site plans, stormwater, utilities" },
  MEP_ENGINEER: { ...PE, specialtiesHint: "e.g. HVAC, electrical, plumbing, fire protection" },
  GEOTECH_ENGINEER: { ...PE, specialtiesHint: "e.g. borings, foundation design, inspections" },
  RE_ATTORNEY: { credential: "Bar admission", credentialHint: "State and year, e.g. NJ 2009, NY 2010", size: "Typical deal size", sizeHint: "e.g. $5M to $100M", specialties: "Practice areas", specialtiesHint: "e.g. acquisitions, construction contracts, leasing", credentialRequired: true, portfolio: "Add a matter you worked on (past project)" },
  SECURITIES_ATTORNEY: { credential: "Bar admission", credentialHint: "State and year", size: "Typical raise size", sizeHint: "e.g. $2M to $50M", specialties: "Practice areas", specialtiesHint: "e.g. Reg D 506(b)/(c), fund formation", credentialRequired: true, portfolio: "Add a matter you worked on (past project)" },
  ZONING_ATTORNEY: { credential: "Bar admission", credentialHint: "State and year", size: "Typical project size", sizeHint: "e.g. 10 to 300 units", specialties: "Practice areas", specialtiesHint: "e.g. use variances, site plan, redevelopment", credentialRequired: true, portfolio: "Add a matter you worked on (past project)" },
  INSURANCE: { credential: "Producer license", credentialHint: "State and number", size: "Typical project value insured", sizeHint: "e.g. $5M to $75M", specialties: "Coverage lines", specialtiesHint: "e.g. builder's risk, GL, umbrella, OCIP", credentialRequired: true },
  SURETY_BONDING: { credential: "Producer license", credentialHint: "State and number", size: "Bond size range", sizeHint: "e.g. $1M to $30M", specialties: "Bond types", specialtiesHint: "e.g. performance, payment, bid, subdivision", credentialRequired: true },
  BROKER: { credential: "Broker license", credentialHint: "State and number", size: "Typical deal size", specialties: "Services", specialtiesHint: "e.g. sales, leasing, capital advisory", credentialRequired: true },
  APPRAISER: { credential: "Appraiser certification", credentialHint: "State and number", size: "Typical assignment", specialties: "Property types", specialtiesHint: "e.g. multifamily, land, construction", credentialRequired: true },
  PROPERTY_MANAGER: { credential: "Licenses", credentialHint: "e.g. NJ broker license if required", size: "Portfolio size", sizeHint: "e.g. 1,200 units", specialties: "Property types", specialtiesHint: "e.g. multifamily lease-up, HOA" },
  ACCOUNTANT: { credential: "CPA license", credentialHint: "State and number", size: "Typical client size", specialties: "Services", specialtiesHint: "e.g. cost segregation, tax, audit", credentialRequired: true },
  EXCHANGE_1031: { credential: "Bonding and coverage", credentialHint: "Fidelity bond and E&O", size: "Typical exchange size", specialties: "Exchange types", specialtiesHint: "e.g. forward, reverse, improvement" },
  SURVEYOR: { credential: "Land surveyor license", credentialHint: "State and number", size: "Typical site size", sizeHint: "e.g. 1 to 50 acres", specialties: "Survey types", specialtiesHint: "e.g. ALTA, boundary, topographic, as-built", insurance: true, credentialRequired: true },
  TITLE_COMPANY: { credential: "Title producer license", credentialHint: "State and number; underwriters", size: "Typical transaction size", specialties: "Services", specialtiesHint: "e.g. commercial title, escrow, closings", credentialRequired: true },
  ENVIRONMENTAL_CONSULTANT: { credential: "Licenses and certifications", credentialHint: "e.g. NJ LSRP number", size: "Typical site size", specialties: "Services", specialtiesHint: "e.g. Phase I, Phase II, remediation, asbestos", insurance: true, credentialRequired: true },
  PERMIT_EXPEDITER: { credential: "Registrations", credentialHint: "Municipal registrations if any", size: "Typical project size", specialties: "Jurisdictions", specialtiesHint: "e.g. Montclair, Newark, Jersey City" },
};

export function roleProfile(role: string | null | undefined): RoleProfile {
  return { ...BASE, ...(role ? ROLE_PROFILES[role] : {}) };
}
