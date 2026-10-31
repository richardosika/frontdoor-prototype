/**
 * #51 Standard bid templates, one per member category. Staff approve each version in Admin › Bid templates.
 * Every template ends with the common section (price summary, schedule, terms, exclusions, validity, profile facts).
 */
export type BidFieldType = "money" | "percent" | "number" | "months" | "date" | "text" | "long" | "checks" | "yesno" | "profile";
export type BidSection = "price" | "terms" | "risk" | "scope";
export type BidField = {
  key: string;
  label: string;
  type: BidFieldType;
  section: BidSection;
  /** Default true. A required field left empty is flagged "Not provided" in the comparison. */
  required?: boolean;
  /** Show per unit and per SF rows in the comparison (money only). */
  perUnit?: boolean;
  /** Best value per row: lowest cost/rate, highest capacity, shortest duration. */
  best?: "low" | "high" | "short";
  options?: string[];
  /** For profile fields: which verified profile fact is auto-filled. */
  source?: "insurance" | "license";
  hint?: string;
};
export type TemplateSeed = { category: string; name: string; version: number; fields: BidField[] };

const f = (key: string, label: string, type: BidFieldType, section: BidSection, extra: Partial<BidField> = {}): BidField => ({ key, label, type, section, ...extra });
const opt = { required: false };

/** Common section on every template. `totalLabel` names the price summary in that trade's terms. */
export function commonFields(totalLabel: string, opts: { license?: boolean; insurance?: boolean; perUnit?: boolean } = {}): BidField[] {
  return [
    f("total", totalLabel, "money", "price", { perUnit: opts.perUnit ?? true, best: "low" }),
    f("start", "Start date", "date", "terms"),
    f("duration", "Duration (months)", "months", "terms", { best: "short" }),
    f("paymentTerms", "Payment terms", "text", "terms"),
    f("validUntil", "Proposal valid until", "date", "terms"),
    ...(opts.insurance === false ? [] : [f("profileInsurance", "Insurance (profile)", "profile", "risk", { source: "insurance", required: false })]),
    ...(opts.license === false ? [] : [f("profileLicense", "License (profile)", "profile", "risk", { source: "license", required: false })]),
    f("exclusions", "Exclusions", "long", "scope"),
    f("assumptions", "Assumptions & notes", "long", "scope", opt),
  ];
}

const T = (category: string, name: string, specific: BidField[], total: string, o: Parameters<typeof commonFields>[1] = {}): TemplateSeed => {
  const common = commonFields(total, o);
  const head = common.slice(0, 1);
  return { category, name, version: 1, fields: [...head, ...specific, ...common.slice(1)] };
};

export const BID_TEMPLATE_SEEDS: TemplateSeed[] = [
  {
    category: "GENERAL_CONTRACTOR",
    name: "General contractor",
    version: 3,
    fields: [
      f("total", "Base price (lump sum)", "money", "price", { perUnit: true, best: "low" }),
      f("generalConditions", "General conditions", "money", "price", { best: "low" }),
      f("sitework", "Sitework", "money", "price", { best: "low" }),
      f("structure", "Structure", "money", "price", { best: "low" }),
      f("mep", "MEP", "money", "price", { best: "low" }),
      f("finishes", "Finishes", "money", "price", { best: "low" }),
      f("feePct", "Fee %", "percent", "price", { best: "low" }),
      f("contingency", "Contingency", "money", "price"),
      f("alternates", "Alternates", "text", "price", opt),
      f("start", "Start date", "date", "terms"),
      f("duration", "Duration (months)", "months", "terms", { best: "short" }),
      f("paymentTerms", "Payment terms", "text", "terms"),
      f("validUntil", "Proposal valid until", "date", "terms"),
      f("bonding", "Bonding capacity", "text", "risk"),
      f("profileInsurance", "Insurance (profile)", "profile", "risk", { source: "insurance", required: false }),
      f("profileLicense", "License (profile)", "profile", "risk", { source: "license", required: false }),
      f("exclusionList", "Exclusions", "checks", "scope", { options: ["Permit & utility fees excluded", "Builder's risk by owner", "Hazardous material abatement excluded", "Winter conditions included"], required: false }),
      f("exclusions", "Other exclusions", "long", "scope", opt),
      f("assumptions", "Assumptions & notes", "long", "scope", opt),
    ],
  },
  {
    category: "INSURANCE",
    name: "Insurance · Builder's risk & GL",
    version: 2,
    fields: [
      f("total", "Total annual premium", "money", "price", { perUnit: true, best: "low" }),
      f("linesQuoted", "Lines quoted", "checks", "price", { options: ["Builder's risk", "General liability", "Umbrella / excess", "Workers' comp", "Professional liability", "Pollution liability"] }),
      f("premiumBuildersRisk", "Premium · Builder's risk", "money", "price", { best: "low", required: false }),
      f("premiumGl", "Premium · General liability", "money", "price", { best: "low", required: false }),
      f("premiumUmbrella", "Premium · Umbrella", "money", "price", { best: "low", required: false }),
      f("limits", "Limits (per occurrence / aggregate)", "text", "risk"),
      f("deductibles", "Deductibles", "text", "risk"),
      f("carrier", "Carrier", "text", "risk"),
      f("amBest", "AM Best rating", "text", "risk"),
      f("start", "Policy start", "date", "terms"),
      f("duration", "Term (months)", "months", "terms"),
      f("paymentTerms", "Payment terms", "text", "terms"),
      f("validUntil", "Quote valid until", "date", "terms"),
      f("profileLicense", "License (profile)", "profile", "risk", { source: "license", required: false }),
      f("exclusions", "Exclusions", "long", "scope"),
      f("assumptions", "Assumptions & notes", "long", "scope", opt),
    ],
  },
  T("ARCHITECT_ENGINEER", "Architect / Engineer", [
    f("feeBasis", "Fee basis", "text", "price", { hint: "Fixed fee, % of construction cost, or hourly" }),
    f("feePct", "Fee % of construction", "percent", "price", { best: "low", required: false }),
    f("phases", "Phases included", "checks", "scope", { options: ["Schematic design", "Design development", "Construction documents", "Permitting", "Bidding", "Construction administration"] }),
    f("deliverables", "Deliverables", "long", "scope"),
    f("consultants", "Consultants included", "text", "scope"),
    f("reimbursables", "Reimbursables", "text", "price", opt),
  ], "Total fee"),
  T("FINANCING", "Financing · Lender / mortgage broker", [
    f("loanAmount", "Loan amount", "money", "price", { best: "high" }),
    f("rate", "Interest rate %", "percent", "price", { best: "low" }),
    f("rateType", "Rate type / index", "text", "price"),
    f("ltc", "Loan to cost %", "percent", "risk", { best: "high", required: false }),
    f("ltv", "Loan to value %", "percent", "risk", { best: "high", required: false }),
    f("originationPct", "Origination fee %", "percent", "price", { best: "low" }),
    f("exitPct", "Exit fee %", "percent", "price", { best: "low", required: false }),
    f("recourse", "Recourse", "text", "risk", { hint: "Full, partial, non-recourse, burn-off" }),
    f("interestReserve", "Interest reserve", "money", "price", opt),
    f("extensions", "Extension options", "text", "terms", opt),
  ], "Total fees & points", { insurance: false, perUnit: false }),
  T("EQUITY", "Equity · Investor / family office", [
    f("commitment", "Equity commitment", "money", "price", { best: "high" }),
    f("prefReturn", "Preferred return %", "percent", "price", { best: "low" }),
    f("promote", "Promote / waterfall", "text", "price"),
    f("coInvest", "Sponsor co-invest required %", "percent", "risk", { best: "low", required: false }),
    f("controlRights", "Major decision / control rights", "long", "risk"),
    f("holdPeriod", "Target hold (months)", "months", "terms", opt),
  ], "Fees charged to the deal", { insurance: false, license: false, perUnit: false }),
  T("DEVELOPMENT_PARTNER", "Development partner", [
    f("devFeePct", "Development fee %", "percent", "price", { best: "low" }),
    f("equityContribution", "Equity contribution", "money", "price", { best: "high", required: false }),
    f("profitSplit", "Profit split", "text", "price"),
    f("guarantees", "Guarantees provided", "text", "risk"),
    f("responsibilities", "Responsibilities", "long", "scope"),
  ], "Total development fee", { insurance: false, license: false }),
  ...(["RE_ATTORNEY", "SECURITIES_ATTORNEY", "ZONING_ATTORNEY"] as const).map((category) =>
    T(category, category === "RE_ATTORNEY" ? "Real estate attorney" : category === "SECURITIES_ATTORNEY" ? "Securities attorney" : "Zoning / land use attorney", [
      f("feeBasis", "Fee basis", "text", "price", { hint: "Flat fee, hourly, capped" }),
      f("hourlyRate", "Blended hourly rate", "money", "price", { best: "low", required: false }),
      f("estimateLow", "Estimate · low", "money", "price", { best: "low" }),
      f("estimateHigh", "Estimate · high", "money", "price", { best: "low" }),
      f("scope", "Scope of work", "long", "scope"),
      f("team", "Lead attorney & team", "text", "risk"),
      ...(category === "ZONING_ATTORNEY" ? [f("approvals", "Approvals pursued", "text", "scope"), f("hearings", "Hearings included", "number", "scope", opt)] : []),
      f("conflicts", "Conflicts cleared", "yesno", "risk"),
    ], "Total estimated fee", { perUnit: false }),
  ),
  T("SURETY_BONDING", "Surety / bonding", [
    f("bondTypes", "Bond types", "checks", "price", { options: ["Performance", "Payment", "Bid", "Completion", "Subdivision"] }),
    f("bondAmount", "Bond amount", "money", "price"),
    f("ratePct", "Bond rate %", "percent", "price", { best: "low" }),
    f("singleCapacity", "Single job capacity", "money", "risk", { best: "high" }),
    f("aggregateCapacity", "Aggregate capacity", "money", "risk", { best: "high" }),
    f("surety", "Surety company", "text", "risk"),
    f("amBest", "AM Best rating / T-listing", "text", "risk"),
    f("indemnity", "Indemnity required", "text", "risk"),
  ], "Total bond premium"),
  T("BROKER", "Broker", [
    f("serviceType", "Service", "text", "scope", { hint: "Sale, leasing, capital markets" }),
    f("commissionPct", "Commission %", "percent", "price", { best: "low" }),
    f("coBrokerPct", "Co-broker split %", "percent", "price", opt),
    f("listingTerm", "Listing term (months)", "months", "terms"),
    f("pricingOpinion", "Pricing opinion / target price", "money", "price", { best: "high", required: false }),
    f("marketingPlan", "Marketing plan", "long", "scope"),
  ], "Estimated total commission", { insurance: false }),
  T("APPRAISER", "Appraiser", [
    f("reportType", "Report type", "text", "scope", { hint: "Narrative, restricted, as-is / as-complete" }),
    f("approaches", "Approaches", "checks", "scope", { options: ["Sales comparison", "Income", "Cost"] }),
    f("turnaroundDays", "Turnaround (days)", "number", "terms", { best: "low" }),
    f("lenderApproved", "On lender's approved panel", "yesno", "risk"),
  ], "Appraisal fee", { perUnit: false }),
  T("PROPERTY_MANAGER", "Property manager", [
    f("mgmtFeePct", "Management fee % of collected revenue", "percent", "price", { best: "low" }),
    f("leaseUpFee", "Lease-up fee per lease", "money", "price", { best: "low" }),
    f("renewalFee", "Renewal fee", "money", "price", { best: "low", required: false }),
    f("setupFee", "Onboarding / setup fee", "money", "price", { best: "low", required: false }),
    f("staffing", "On-site staffing plan", "long", "scope"),
    f("software", "Software & reporting", "text", "scope", opt),
    f("termination", "Termination notice (days)", "number", "terms"),
  ], "Estimated annual fees"),
  T("ACCOUNTANT", "Accountant / Cost seg", [
    f("services", "Services", "checks", "scope", { options: ["Cost segregation study", "Tax returns", "Audit / review", "Fund accounting", "1031 / tax planning"] }),
    f("feeBasis", "Fee basis", "text", "price"),
    f("estBenefit", "Estimated first-year tax benefit", "money", "price", { best: "high", required: false }),
    f("turnaroundDays", "Turnaround (days)", "number", "terms", { best: "low" }),
  ], "Total fee", { insurance: false, perUnit: false }),
  T("EXCHANGE_1031", "1031 exchange", [
    f("exchangeType", "Exchange type", "text", "scope", { hint: "Forward, reverse, improvement" }),
    f("setupFee", "Exchange fee", "money", "price", { best: "low" }),
    f("perPropertyFee", "Fee per additional property", "money", "price", { best: "low", required: false }),
    f("interestOnFunds", "Interest paid on held funds %", "percent", "price", { best: "high", required: false }),
    f("fidelityBond", "Fidelity bond / E&O coverage", "money", "risk", { best: "high" }),
    f("segregated", "Funds held in segregated accounts", "yesno", "risk"),
  ], "Total exchange fees", { perUnit: false }),
  T("SURVEYOR", "Surveyor", [
    f("surveyTypes", "Survey types", "checks", "scope", { options: ["ALTA/NSPS", "Boundary", "Topographic", "As-built", "Construction staking"] }),
    f("tableA", "ALTA Table A items", "text", "scope", opt),
    f("turnaroundDays", "Turnaround (days)", "number", "terms", { best: "low" }),
  ], "Survey fee", { perUnit: false }),
  T("TITLE_COMPANY", "Title company", [
    f("ownerPremium", "Owner's policy premium", "money", "price", { best: "low" }),
    f("lenderPremium", "Lender's policy premium", "money", "price", { best: "low" }),
    f("endorsements", "Endorsements (list + cost)", "long", "price"),
    f("closingFees", "Settlement / closing fees", "money", "price", { best: "low" }),
    f("underwriter", "Underwriter", "text", "risk"),
    f("commitmentDays", "Commitment turnaround (days)", "number", "terms", { best: "low" }),
  ], "Total title & closing cost", { perUnit: false }),
  T("ENVIRONMENTAL_CONSULTANT", "Environmental consultant", [
    f("services", "Services", "checks", "scope", { options: ["Phase I ESA", "Phase II ESA", "Remediation", "Asbestos / lead survey", "Vapor intrusion"] }),
    f("phase1Fee", "Phase I fee", "money", "price", { best: "low", required: false }),
    f("phase2Fee", "Phase II fee (estimate)", "money", "price", { best: "low", required: false }),
    f("turnaroundDays", "Turnaround (days)", "number", "terms", { best: "low" }),
    f("standard", "Standard (e.g. ASTM E1527-21)", "text", "scope"),
  ], "Total fee", { perUnit: false }),
  T("GEOTECH_ENGINEER", "Geotechnical engineer", [
    f("borings", "Borings (count / depth)", "text", "scope"),
    f("labTesting", "Lab testing", "text", "scope"),
    f("report", "Report & foundation recommendations", "text", "scope"),
    f("turnaroundDays", "Turnaround (days)", "number", "terms", { best: "low" }),
  ], "Total fee", { perUnit: false }),
  ...(["CIVIL_ENGINEER", "STRUCTURAL_ENGINEER", "MEP_ENGINEER"] as const).map((category) =>
    T(category, category === "CIVIL_ENGINEER" ? "Civil engineer" : category === "STRUCTURAL_ENGINEER" ? "Structural engineer" : "MEP engineer", [
      f("feeBasis", "Fee basis", "text", "price"),
      f("phases", "Phases included", "checks", "scope", { options: ["Schematic design", "Design development", "Construction documents", "Permitting", "Construction administration"] }),
      f("deliverables", "Deliverables", "long", "scope"),
      f("hourlyRate", "Hourly rate for additional services", "money", "price", { best: "low", required: false }),
    ], "Total fee"),
  ),
  T("PERMIT_EXPEDITER", "Permit expediter", [
    f("permits", "Permits & approvals covered", "long", "scope"),
    f("feeBasis", "Fee basis", "text", "price"),
    f("filingFees", "Government filing fees", "text", "price", { hint: "Included or pass-through" }),
    f("expectedDays", "Expected approval time (days)", "number", "terms", { best: "low" }),
  ], "Total fee", { perUnit: false }),
];

/** Subcontractor trade work bid by a GC's subs uses the GC template's unit-price variant below. */
export const SUBCONTRACTOR_TEMPLATE: TemplateSeed = T("SUBCONTRACTOR", "Subcontractor trade", [
  f("trade", "Trade", "text", "scope"),
  f("unitPricing", "Unit pricing", "long", "price", opt),
  f("crew", "Crew size / manpower", "text", "terms", opt),
], "Lump sum");

/** All templates seeded and approved at launch. */
export const ALL_TEMPLATE_SEEDS: TemplateSeed[] = [...BID_TEMPLATE_SEEDS, SUBCONTRACTOR_TEMPLATE];
