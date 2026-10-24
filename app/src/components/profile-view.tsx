import Link from "next/link";
import { TierBadge, VerifiedMark } from "@/components/badge";
import { Avatar } from "@/components/avatar";
import { CopyLink } from "@/components/copy-link";
import { btn, btnOutline, field, labelCls } from "@/components/ui";
import { addProject, requestConfirmation } from "@/actions/profile";
import { openConversation, requestConnection } from "@/actions/social";
import { roleById, roleLabel, roleShort } from "@/lib/roles";
import { tierLabel } from "@/lib/format";
import { canOpenProjectToCounterparties, type PublicVerification } from "@/lib/verification";

type Project = {
  id: string;
  name: string;
  asset: string;
  location: string;
  year: number;
  valueLabel: string;
  summary: string;
  confirmations: {
    id: string;
    status: string;
    reviewStatus: string;
    counterpartyName: string;
    token: string;
  }[];
  verification: PublicVerification;
};

export function ProfileView({
  member,
  projects,
  isSelf,
  connection,
  projectCount,
  vouchCount,
  backHref,
  linkOrigin,
  verification,
}: {
  member: {
    id: string;
    name: string;
    initials: string;
    org: string;
    location: string;
    role: string;
    tier: string;
    bio: string;
    credentialNote: string;
    createdAt: Date;
  };
  projects: Project[];
  isSelf: boolean;
  connection: "NONE" | "PENDING" | "ACCEPTED" | "INCOMING";
  projectCount: number;
  vouchCount: number;
  backHref?: string;
  linkOrigin: string;
  verification: PublicVerification;
}) {
  const role = roleById(member.role);
  const tiers = [
    ["INVITED", "Invited by a member; light checks at application."],
    ["VERIFIED", "Role credentials and references checked by an admin."],
    ["CONFIRMED", "The committee accepted a counterparty vouch."],
  ] as const;

  return (
    <article className="border-x border-b border-line bg-paper md:overflow-hidden md:rounded md:border">
      <div className="cover-forest notch relative z-0 h-[calc(8rem+env(safe-area-inset-top,0px))] overflow-hidden bg-forest md:h-40">
        {backHref ? (
          <Link href={backHref} className="absolute left-4 top-[calc(env(safe-area-inset-top,0px)+1rem)] z-10 inline-flex min-h-11 items-center font-sans text-sm text-paper md:hidden">
            ‹ Network
          </Link>
        ) : null}
      </div>
      <div className="relative z-10 flex items-end justify-between px-5">
        <div className="-mt-11">
          <span className="relative z-10 inline-grid rounded-full shadow-[0_0_0_4px_#FFFDF8]">
            <Avatar initials={member.initials} size="lg" />
          </span>
        </div>
        <div className="mb-2 flex gap-2">
          {isSelf ? null : (
            <>
              <form action={openConversation}>
                <input type="hidden" name="userId" value={member.id} />
                <button className={btnOutline} type="submit">
                  Message
                </button>
              </form>
              {connection === "ACCEPTED" ? (
                <span className={`${btnOutline} pointer-events-none`}>Connected</span>
              ) : connection === "PENDING" ? (
                <span className={`${btn} pointer-events-none bg-mut`}>Requested</span>
              ) : connection === "INCOMING" ? (
                <Link href="/network" className={btn}>
                  Respond
                </Link>
              ) : (
                <form action={requestConnection}>
                  <input type="hidden" name="toId" value={member.id} />
                  <button className={btn} type="submit">
                    Connect
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
      <div className="px-5 pb-6 sm:px-7">
        <h1 className="mt-3 flex flex-wrap items-center gap-2 font-serif text-[26px] font-normal">
          {member.name} <TierBadge tier={member.tier} />
        </h1>
        <div className="mt-2">
          <VerifiedMark view={verification} />
        </div>
        <p className="mt-1 text-sm text-mut">
          {member.org} · {member.location}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-sm bg-brass px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-paper">
            {roleShort(roleLabel(member.role))}
          </span>
          <span className="rounded-sm border border-line px-2.5 py-1 text-[11px] text-mut">
            Member since {member.createdAt.getFullYear()}
          </span>
        </div>
        {member.bio ? <p className="mt-4 text-sm leading-relaxed text-ink">{member.bio}</p> : null}
        <div className="mt-4 grid grid-cols-3 overflow-hidden border-y border-brass-line">
          <Stat value={String(projectCount)} label="Projects" />
          <Stat value={String(vouchCount)} label="Vouches" />
          <Stat value={tierLabel(member.tier)} label="Tier" />
        </div>
        <h2 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Verification</h2>
        <div className="rounded border border-line border-l-[3px] border-l-brass bg-paper px-3 py-2">
          <small className="text-[10.5px] uppercase tracking-wide text-mut">{role?.credentialLabel}</small>
          <b className="mt-0.5 block text-[13px] font-medium">{member.credentialNote || "Credential on file"}</b>
        </div>
        <h2 className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Verification tier</h2>
        <div className="overflow-hidden rounded border border-line">
          {tiers.map(([id, copy]) => (
            <div key={id} className={`flex gap-3 border-b border-line px-3 py-2 last:border-0 ${member.tier === id ? "border-l-[3px] border-l-brass bg-brass-soft" : ""}`}>
              <TierBadge tier={id} />
              <small className="text-[11px] leading-snug text-mut">
                {member.tier === id ? <b className="text-forest">Current tier. </b> : null}
                {copy}
              </small>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded border border-line bg-cream px-3 py-2 text-[12px] leading-relaxed text-ink">
          <b>How verification works</b>
          <ol className="mt-1 list-decimal pl-4">
            <li>Invite code from an existing member.</li>
            <li>Credential check for this role: {role?.check}.</li>
            <li>References are on the application.</li>
            <li>The committee finishes the file before a project is open to counterparties. A vouch is reviewed before Confirmed.</li>
          </ol>
        </div>
        <h2 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Track record</h2>
        {projects.length === 0 ? <p className="text-sm text-mut">No projects listed yet.</p> : null}
        <ul>
          {projects.map((project) => {
            const confirmed = project.confirmations.filter((item) => item.reviewStatus === "APPROVED").length;
            const pending = project.confirmations.filter(
              (item) => item.status === "PENDING" || item.reviewStatus === "PENDING_ADMIN",
            ).length;
            return (
              <li key={project.id} className="flex gap-3 border-b border-line py-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-sm border border-line bg-cream text-forest">▦</span>
                <div className="min-w-0 flex-1">
                  <b className="text-sm">{project.name}</b>
                  <div className="mt-1">
                    <VerifiedMark view={project.verification} />
                  </div>
                  <div className="text-xs text-mut">
                    {project.asset} · {project.location} · {project.year}
                    {confirmed ? ` · ${confirmed} confirmed` : ""}
                    {pending ? ` · ${pending} pending` : ""}
                  </div>
                  {project.summary ? <p className="mt-1 text-xs text-ink">{project.summary}</p> : null}
                  {isSelf
                    ? project.confirmations.map((item) => (
                        <div key={item.id} className="mt-2 text-xs text-ink">
                          <span className="font-semibold">{item.counterpartyName}</span>
                          <span className="text-mut"> · {vouchState(item)}</span>
                          {item.status === "PENDING" && canOpenProjectToCounterparties(project.verification) ? (
                            <CopyLink url={`${linkOrigin}/confirm/${item.token}`} />
                          ) : null}
                        </div>
                      ))
                    : null}
                  {isSelf && canOpenProjectToCounterparties(project.verification) ? (
                    <form action={requestConfirmation} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input type="hidden" name="projectId" value={project.id} />
                      <input name="counterpartyName" placeholder="Counterparty name" className={field} required />
                      <input name="counterpartyEmail" type="email" placeholder="Counterparty email" className={field} required />
                      <button className={btnOutline} type="submit">
                        Request vouch
                      </button>
                    </form>
                  ) : null}
                </div>
                <span className="font-serif text-sm text-forest">{project.valueLabel}</span>
              </li>
            );
          })}
        </ul>
        {isSelf ? (
          <form action={addProject} className="mt-4 grid gap-2 rounded border border-line p-3 sm:grid-cols-2">
            <p className={`${labelCls} sm:col-span-2`}>Add a project</p>
            <input name="name" placeholder="Project name" className={field} required />
            <input name="asset" placeholder="Asset class" className={field} required />
            <input name="location" placeholder="City, ST" className={field} required />
            <input name="year" type="number" placeholder="Year" className={field} required />
            <input name="valueLabel" placeholder="$24M" className={field} required />
            <input name="summary" placeholder="Your role on the project" className={field} />
            <button className={`${btn} sm:col-span-2`} type="submit">
              Save project
            </button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

function vouchState(item: { status: string; reviewStatus: string }) {
  if (item.status === "PENDING") return "link ready to send";
  if (item.status === "DECLINED") return "counterparty declined";
  if (item.reviewStatus === "PENDING_ADMIN") return "confirmed, awaiting committee review";
  if (item.reviewStatus === "APPROVED") return "vouch accepted";
  if (item.reviewStatus === "REJECTED") return "committee did not accept this vouch";
  return "recorded";
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-r border-line px-3 py-2.5 last:border-0">
      <b className="block font-serif text-lg font-normal">{value}</b>
      <small className="text-[9.5px] uppercase tracking-wider text-mut">{label}</small>
    </div>
  );
}
