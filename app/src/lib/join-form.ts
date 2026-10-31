import { MEMBER_NDA_ERROR } from "@/lib/member-nda-copy";
import { MEMBER_RISK_ERROR } from "@/lib/member-risk";
import { isRoleId, type RoleId } from "@/lib/roles";
import { US_STATES } from "@/lib/member-network";
import { validateAddress, validatePersonName } from "@/lib/person-fields";

export const JOIN_REGIONS = [
  "Northeast",
  "Mid-Atlantic",
  "Southeast",
  "Florida",
  "Midwest",
  "Texas / Southwest",
  "Mountain West",
  "West Coast",
  "Nationwide",
] as const;

export const JOIN_PROPERTY_TYPES = [
  "Multifamily",
  "Single family / townhome",
  "Condo",
  "Mixed-use",
  "Office",
  "Retail",
  "Industrial",
  "Hotel",
  "Assisted living / memory care",
  "Self storage",
  "Land",
  "Other",
] as const;

export const LINK_KINDS = [
  "LinkedIn (personal)",
  "LinkedIn (company)",
  "Instagram (business)",
  "Facebook",
  "YouTube",
] as const;

export const DEAL_SIZES = ["Under $5M", "$5M – $25M", "$25M – $100M", "$100M+"] as const;
export const DEAL_COUNTS = ["1–5", "6–15", "16–40", "40+"] as const;

export const JOIN_ROLES: { id: RoleId; label: string }[] = [
  { id: "DEVELOPER", label: "Developer" },
  { id: "GENERAL_CONTRACTOR", label: "General contractor" },
  { id: "BROKER", label: "Broker" },
  { id: "RE_ATTORNEY", label: "Attorney / advisor" },
  { id: "INVESTOR_PE", label: "Investor / LP" },
  { id: "FAMILY_OFFICE", label: "Family office" },
  { id: "LENDER", label: "Lender" },
  { id: "INSURANCE", label: "Insurance (broker / agent / carrier)" },
  { id: "MORTGAGE_BROKER", label: "Mortgage Broker" },
  { id: "ARCHITECT_ENGINEER", label: "Architect / Engineer" },
  { id: "APPRAISER", label: "Appraiser" },
  { id: "PROPERTY_MANAGER", label: "Property Manager" },
  { id: "ACCOUNTANT", label: "Accountant / Cost Seg" },
  { id: "EXCHANGE_1031", label: "1031 Exchange Intermediary" },
  { id: "SURVEYOR", label: "Surveyor" },
  { id: "TITLE_COMPANY", label: "Title Company" },
  { id: "ENVIRONMENTAL_CONSULTANT", label: "Environmental Consultant" },
  { id: "GEOTECH_ENGINEER", label: "Geotechnical Engineer" },
  { id: "CIVIL_ENGINEER", label: "Civil Engineer" },
  { id: "STRUCTURAL_ENGINEER", label: "Structural Engineer" },
  { id: "PERMIT_EXPEDITER", label: "Permit Expediter" },
  { id: "MEP_ENGINEER", label: "MEP Engineer" },
  { id: "SURETY_BONDING", label: "Surety / Bonding" },
];

export function joinRoleLabel(id: string): string {
  return JOIN_ROLES.find((role) => role.id === id)?.label ?? id;
}

export type PageKind = "developer" | "gc" | "licensed" | "attorney" | "lender" | "investor" | "family" | "specialty";

const LICENSED = new Set(["BROKER", "INSURANCE", "MORTGAGE_BROKER", "ARCHITECT_ENGINEER", "APPRAISER", "SURVEYOR", "GEOTECH_ENGINEER", "CIVIL_ENGINEER", "STRUCTURAL_ENGINEER", "MEP_ENGINEER", "SURETY_BONDING", "TITLE_COMPANY"]);

export function pageKind(role: string): PageKind {
  if (role === "DEVELOPER") return "developer";
  if (role === "GENERAL_CONTRACTOR") return "gc";
  if (role === "RE_ATTORNEY") return "attorney";
  if (role === "LENDER") return "lender";
  if (role === "INVESTOR_PE") return "investor";
  if (role === "FAMILY_OFFICE") return "family";
  if (LICENSED.has(role)) return "licensed";
  return "specialty";
}

export function projectsRequired(role: string): number {
  return role === "GENERAL_CONTRACTOR" ? 2 : 0;
}

/** Developers and investors may apply as individuals, so company fields stay optional. */
export function companyFieldsOptional(role: string): boolean {
  return role === "DEVELOPER" || role === "INVESTOR_PE";
}

export function showsProjects(role: string): boolean {
  return pageKind(role) !== "attorney";
}

export function showsStateList(role: string): boolean {
  const kind = pageKind(role);
  return kind === "gc" || kind === "licensed" || kind === "attorney";
}

export function stateListCopy(role: string): { title: string; licensed: string; number: string; verb: string } {
  if (role === "RE_ATTORNEY") {
    return {
      title: "Bar admissions and states you're looking to work in",
      licensed: "Admitted here",
      number: "Bar number (optional)",
      verb: "admitted",
    };
  }
  return {
    title: "States you're licensed in and looking to work in",
    licensed: "Licensed here",
    number: "License number (optional)",
    verb: "licensed",
  };
}

export const ATTORNEY_SPECIALTIES = [
  "Acquisitions & dispositions",
  "Development & land use / zoning",
  "Construction law",
  "Commercial leasing",
  "Real estate finance / lending",
  "Joint ventures & syndication",
  "Securities / fund formation (Reg D)",
  "1031 exchanges",
  "Title & closings",
  "Condo / HOA",
  "Landlord-tenant",
  "Litigation & disputes",
  "Tax & accounting",
  "Entity formation",
  "Environmental",
  "Affordable housing / tax credits",
  "Other",
];

export const PARTICIPATION = [
  "LP (passive equity)",
  "GP / co-GP",
  "JV partner",
  "Co-investor (deal-by-deal)",
  "Preferred equity",
  "Mezzanine / private debt",
  "Fund investor",
  "Land / site partner (contribute land)",
  "1031 exchange buyer",
  "Opportunity Zone investor",
  "Other",
];

export const LOAN_GROUPS: { group: string; types: string[] }[] = [
  { group: "Construction & land", types: ["Construction", "Land / acquisition"] },
  { group: "Bridge & short-term", types: ["Bridge", "Hard money / private", "Fix & flip", "Line of credit"] },
  { group: "Permanent & agency", types: ["Permanent / term", "Fannie Mae / Freddie Mac (agency multifamily)", "CMBS", "DSCR / rental"] },
  { group: "Government-backed", types: ["SBA 7(a)", "SBA 504", "USDA", "FHA / HUD (221(d)(4), 223(f))"] },
  { group: "Capital stack & specialty", types: ["Mezzanine", "Preferred equity", "PACE / C-PACE", "Equipment financing", "Other"] },
];

export const LENDER_TYPES = ["Bank", "Credit union", "CDFI", "Life company", "SBA lender", "Agency lender", "Debt fund", "Private lender", "Other"];

export const COVERAGE_TYPES = [
  "Builder's risk",
  "General liability",
  "Property",
  "Professional / E&O",
  "Surety / bonds",
  "Workers' comp",
  "Umbrella",
  "Title",
  "Other",
];

export const ROLE_SPECIALTIES: Partial<Record<RoleId, { label: string; options: string[] }>> = {
  MORTGAGE_BROKER: {
    label: "Loan focus",
    options: ["Residential purchase", "Refinance", "Construction", "Bridge", "DSCR / rental", "Commercial", "SBA", "Other"],
  },
  ARCHITECT_ENGINEER: {
    label: "Practice",
    options: ["Architecture", "Civil", "Structural", "MEP", "Land planning", "Interior", "Landscape", "Other"],
  },
  APPRAISER: {
    label: "Appraisal work",
    options: ["Commercial", "Residential", "Multifamily", "Land", "Going concern", "Review appraisal", "Other"],
  },
  PROPERTY_MANAGER: {
    label: "Properties you manage",
    options: ["Multifamily", "Office", "Retail", "Industrial", "HOA / condo", "Affordable", "Other"],
  },
  ACCOUNTANT: {
    label: "Services",
    options: ["Tax", "Audit", "Cost segregation", "CFO", "Bookkeeping", "Other"],
  },
  EXCHANGE_1031: {
    label: "Exchange work",
    options: ["Forward exchange", "Reverse exchange", "Improvement exchange", "DST", "Other"],
  },
};

export const INVESTOR_TYPES = ["Individual", "LLC / partnership", "Fund", "Trust", "Institution"];
export const HOLD_PERIODS = ["Under 2 years", "2–5 years", "5–10 years", "10+ years"];
export const INVESTMENT_RANGES = ["Under $250K", "$250K – $1M", "$1M – $5M", "$5M+"];

export type JoinLink = { kind: string; url: string };
export type JoinProject = { name: string; location: string; role: string; llc: string; link: string };
export type JoinState = { state: string; licensed: boolean; looking: boolean; licenseNumber: string };

export type JoinProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  company: string;
  website: string;
  street: string;
  suite: string;
  city: string;
  state: string;
  zip: string;
  links: JoinLink[];
  referralCode: string;
  password: string;
  acceptTerms: boolean;
  acceptVerification: boolean;
  acceptMemberRisk: boolean;
  acceptMemberNda: boolean;
  title: string;
  legalName: string;
  formationState: string;
  standout: string;
  yearFounded: string;
  professionalName: string;
  formerNames: string;
  bioUrl: string;
  regions: string[];
  propertyTypes: string[];
  dealSize: string;
  dealCount: string;
  projects: JoinProject[];
  states: JoinState[];
  specialties: string[];
  lenderTypes: string[];
  loanTypes: string[];
  loanSize: string;
  participation: string[];
  holdPeriod: string;
  accredited: string;
  entityName: string;
  entityState: string;
  investorTypes: string[];
  investmentRange: string;
  secCik: string;
  secCrd: string;
  principalCompany: string;
  coverageTypes: string[];
  brokerageUrl: string;
  developing: {
    notYet: boolean;
    type: string;
    location: string;
    size: string;
    stage: string;
    budget: string;
    timeline: string;
    team: string[];
  };
  press: string[];
  referenceName: string;
  referenceCompany: string;
  referenceContact: string;
  lookingFor: string;
};

export function emptyProfile(role = "DEVELOPER", code = ""): JoinProfile {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role,
    company: "",
    website: "",
    street: "",
    suite: "",
    city: "",
    state: "",
    zip: "",
    links: [{ kind: LINK_KINDS[0], url: "" }],
    referralCode: code,
    password: "",
    acceptTerms: false,
    acceptVerification: false,
    acceptMemberRisk: false,
    acceptMemberNda: false,
    title: "",
    legalName: "",
    formationState: "",
    standout: "",
    yearFounded: "",
    professionalName: "",
    formerNames: "",
    bioUrl: "",
    regions: [],
    propertyTypes: [],
    dealSize: "",
    dealCount: "",
    projects: [],
    states: [{ state: "", licensed: false, looking: false, licenseNumber: "" }],
    specialties: [],
    lenderTypes: [],
    loanTypes: [],
    loanSize: "",
    participation: [],
    holdPeriod: "",
    accredited: "",
    entityName: "",
    entityState: "",
    investorTypes: [],
    investmentRange: "",
    secCik: "",
    secCrd: "",
    principalCompany: "",
    coverageTypes: [],
    brokerageUrl: "",
    developing: { notYet: false, type: "", location: "", size: "", stage: "", budget: "", timeline: "", team: [] },
    press: ["", ""],
    referenceName: "",
    referenceCompany: "",
    referenceContact: "",
    lookingFor: "",
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function pageOneErrors(profile: JoinProfile): string[] {
  const errors: string[] = [];
  errors.push(...validatePersonName(profile.firstName, profile.lastName));
  if (!EMAIL.test(profile.email.trim())) errors.push("Enter a valid email.");
  if (profile.phone.trim().replace(/\D/g, "").length < 7) errors.push("Enter a mobile phone number.");
  if (!isRoleId(profile.role) || !JOIN_ROLES.some((role) => role.id === profile.role)) errors.push("Pick a role.");
  const company = profile.company.trim();
  const website = profile.website.trim();
  if (!companyFieldsOptional(profile.role) || company || website) {
    if (company.length < 2) errors.push("Enter your company name.");
    if (website.length < 4) errors.push("Enter your company website.");
  }
  errors.push(...validateAddress({ street: profile.street, city: profile.city, state: profile.state, zip: profile.zip }));
  if (!profile.links.some((link) => link.url.trim().length > 4)) {
    errors.push("Add at least one professional link: LinkedIn, business Instagram, Facebook, or YouTube.");
  }
  return errors;
}

export function pageTwoErrors(profile: JoinProfile): string[] {
  const errors: string[] = [];
  if (profile.title.trim().length < 2) errors.push("Enter your title.");
  if (profile.regions.length < 1) errors.push("Pick at least one region.");
  if (profile.propertyTypes.length < 1) errors.push("Pick at least one property type.");
  if (profile.password.trim().length < 8) errors.push("Create a password of at least 8 characters.");
  if (!profile.acceptTerms || !profile.acceptVerification) errors.push("Check both agreement boxes.");
  if (profile.acceptMemberRisk !== true) errors.push(MEMBER_RISK_ERROR);
  if (profile.acceptMemberNda !== true) errors.push(MEMBER_NDA_ERROR);
  const kind = pageKind(profile.role);
  if (showsProjects(profile.role)) {
    const needed = projectsRequired(profile.role);
    const filled = profile.projects.filter((project) => project.name.trim() && project.location.trim() && project.role.trim());
    if (filled.length < needed) errors.push("General contractors: two recent projects are required.");
  }
  if (showsStateList(profile.role)) {
    const picked = profile.states.filter((row) => US_STATES.includes(row.state as (typeof US_STATES)[number]));
    if (picked.length < 1) errors.push("Add at least one state.");
    if (profile.states.length > 5) errors.push("You can list up to 5 states.");
  }
  if (kind === "attorney" && profile.specialties.length < 1) errors.push("Pick at least one real estate specialty.");
  if (kind === "lender") {
    if (profile.loanTypes.length < 1) errors.push("Pick at least one loan type.");
    if (!profile.loanSize.trim()) errors.push("Pick a typical loan size.");
  }
  if ((kind === "investor" || kind === "family") && profile.participation.length < 1) {
    errors.push("Pick at least one way you want to participate.");
  }
  if (kind === "investor" && profile.investorTypes.length < 1) errors.push("Pick at least one investor type.");
  if (profile.role === "INSURANCE" && profile.coverageTypes.length < 1) errors.push("Pick at least one coverage type.");
  const specialty = ROLE_SPECIALTIES[profile.role as RoleId];
  if (specialty && profile.specialties.length < 1) errors.push(`Pick at least one ${specialty.label.toLowerCase()} option.`);
  return errors;
}

export function locationLine(profile: JoinProfile): string {
  const street = [profile.street.trim(), profile.suite.trim()].filter(Boolean).join(", ");
  return [street, profile.city.trim(), `${profile.state.trim().toUpperCase()} ${profile.zip.trim()}`].filter(Boolean).join(", ");
}

/** Fields a later verification pass can read. Scoring does not use this yet. */
export function verificationInputs(profile: JoinProfile): Record<string, string> {
  const link = profile.links.find((item) => item.url.trim())?.url.trim() ?? "";
  return {
    name: `${profile.firstName} ${profile.lastName}`.trim(),
    email: profile.email.trim().toLowerCase(),
    phone: profile.phone.trim(),
    role: profile.role,
    org: profile.company.trim(),
    website: profile.website.trim(),
    location: locationLine(profile),
    linkedinUrl: profile.links.find((item) => item.kind.startsWith("LinkedIn") && item.url.trim())?.url.trim() || link,
    title: profile.title.trim(),
    regions: profile.regions.join(", "),
    propertyTypes: profile.propertyTypes.join(", "),
  };
}
