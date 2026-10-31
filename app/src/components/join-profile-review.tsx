import { joinRoleLabel, type JoinProfile } from "@/lib/join-form";

function lines(profile: Partial<JoinProfile>): { label: string; value: string }[] {
  const list = (value?: string[]) => (value && value.length ? value.join(", ") : "");
  const projects = (profile.projects || [])
    .filter((project) => project.name || project.location)
    .map((project) => [project.name, project.location, project.role, project.llc].filter(Boolean).join(" · "));
  const states = (profile.states || [])
    .filter((row) => row.state)
    .map((row) => [row.state, row.licensed ? "licensed" : "", row.looking ? "looking" : "", row.licenseNumber].filter(Boolean).join(" · "));
  return [
    { label: "Role on the form", value: profile.role ? joinRoleLabel(profile.role) : "" },
    { label: "Title", value: profile.title || "" },
    { label: "Suite", value: profile.suite || "" },
    { label: "Regions", value: list(profile.regions) },
    { label: "Property types", value: list(profile.propertyTypes) },
    { label: "What stands out", value: profile.standout || "" },
    { label: "Legal name", value: profile.legalName || "" },
    { label: "State of formation", value: profile.formationState || "" },
    { label: "Year founded", value: profile.yearFounded || "" },
    { label: "Professional name", value: profile.professionalName || "" },
    { label: "Former names", value: profile.formerNames || "" },
    { label: "Bio link", value: profile.bioUrl || "" },
    { label: "Deal size", value: profile.dealSize || "" },
    { label: "Deals in 3 years", value: profile.dealCount || "" },
    { label: "Projects", value: projects.join(" | ") },
    { label: "States", value: states.join(" | ") },
    { label: "Specialties", value: list(profile.specialties) },
    { label: "Lender types", value: list(profile.lenderTypes) },
    { label: "Loan types", value: list(profile.loanTypes) },
    { label: "Loan size", value: profile.loanSize || "" },
    { label: "Participation", value: list(profile.participation) },
    { label: "Hold period", value: profile.holdPeriod || "" },
    { label: "Accredited", value: profile.accredited || "" },
    { label: "Entity", value: [profile.entityName, profile.entityState].filter(Boolean).join(", ") },
    { label: "Investor type", value: list(profile.investorTypes) },
    { label: "Investment range", value: profile.investmentRange || "" },
    { label: "SEC CIK", value: profile.secCik || "" },
    { label: "SEC CRD", value: profile.secCrd || "" },
    { label: "Principal company", value: profile.principalCompany || "" },
    { label: "Coverage", value: list(profile.coverageTypes) },
    { label: "Brokerage URL", value: profile.brokerageUrl || "" },
    { label: "Looking for", value: profile.lookingFor || "" },
    { label: "Reference", value: [profile.referenceName, profile.referenceCompany, profile.referenceContact].filter(Boolean).join(" · ") },
  ].filter((row) => row.value.trim());
}

export function JoinProfileReview({ profile }: { profile: unknown }) {
  if (!profile || typeof profile !== "object") return null;
  const rows = lines(profile as Partial<JoinProfile>);
  if (!rows.length) return null;
  return (
    <div className="mt-3 rounded border border-line bg-cream p-3" data-join-profile="1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Application details</p>
      <dl className="mt-2 space-y-1 text-sm">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="inline font-semibold">{row.label}: </dt>
            <dd className="inline break-words">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
