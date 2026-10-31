import { serverTx } from "@/lib/i18n/server";
import Link from "next/link";
import { TierBadge } from "@/components/badge";
import { Avatar } from "@/components/avatar";
import { ProfilePhotos } from "@/components/profile-photos";
import { CopyLink } from "@/components/copy-link";
import { btn, btnOutline, field, labelCls } from "@/components/ui";
import { requestConfirmation } from "@/actions/profile";
import { ProjectForm, ReviewChip } from "@/components/project-form";
import { blockMember, openConversation, respondIntroduction, unblockMember } from "@/actions/social";
import { ProfileEditor } from "@/components/profile-editor";
import { ReportDialog } from "@/components/report-dialog";
import { roleLabel, roleShort } from "@/lib/roles";
import { categoryForRole, memberCategories } from "@/lib/project-contact";
import { tierLabel } from "@/lib/format";
import { canEditProject, parseSeeking, seekLabel, projectLocation, formatProjectValue, fixRoleTypos } from "@/lib/project-contact";
import { canOpenProjectToCounterparties, type PublicVerification } from "@/lib/verification";

type Project = {
  id: string;
  name: string;
  asset: string;
  location: string;
  year: number;
  valueLabel: string;
  summary: string;
  street: string;
  city: string;
  state: string;
  role: string;
  seeking: string;
  shareWithCircle: boolean;
  roleFacts?: string;
  reviewStatus: string;
  reviewNote: string;
  detailsVisible: boolean;
  canContact: boolean;
  contactStatus: string;
  documents: { id: string; title: string; fileName: string; sizeBytes: number; version: number; updatedAt: Date }[];
  documentsVisible: boolean;
  linkedDealId: string;
  confirmations: {
    id: string;
    status: string;
    reviewStatus: string;
    counterpartyName: string;
    token: string;
  }[];
  verification: PublicVerification;
};

export async function ProfileView({
  member,
  projects,
  isSelf,
  connection,
  intro,
  introductionId,
  projectCount,
  vouchCount,
  backHref,
  linkOrigin,
  verification,
  blockedByViewer,
  blockedByThem,
  ownDeals = [],
  gallery = [],
}: {
  ownDeals?: { id: string; title: string }[];
  gallery?: { id: string; caption: string; width: number; height: number }[];
  member: {
    id: string;
    name: string;
    initials: string;
    photoId: string;
    coverId: string;
    org: string;
    location: string;
    role: string;
    tier: string;
    bio: string;
    website: string;
    markets: string;
    dealTypes: string;
    assetClasses: string;
    checkSize: string;
    lookingFor: string;
    offering: string;
    yearsInBusiness?: string;
    typicalJobSize?: string;
    licenses?: string;
    insuranceInfo?: string;
    specialties?: string;
    privateTerms?: string;
    extraCategories?: string;
    pendingCategories?: string;
    createdAt: Date;
  };
  projects: Project[];
  isSelf: boolean;
  connection: "NONE" | "PENDING" | "ACCEPTED" | "INCOMING";
  intro: "NONE" | "PENDING" | "ACCEPTED" | "INCOMING";
  introductionId: string;
  projectCount: number;
  vouchCount: number;
  backHref?: string;
  linkOrigin: string;
  verification: PublicVerification;
  blockedByViewer: boolean;
  blockedByThem: boolean;
}) {
  const tx = await serverTx();
  const messagingClosed = blockedByViewer || blockedByThem;

  return (
    <article className="border-x border-b border-line bg-paper md:overflow-hidden md:rounded md:border">
      <div className="cover-forest notch relative z-0 h-[calc(8rem+env(safe-area-inset-top,0px))] overflow-hidden bg-forest bg-cover bg-center md:h-40"
        style={member.coverId ? { backgroundImage: `url(/api/member-images/${member.coverId})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        data-testid={member.coverId ? "profile-cover" : undefined}
      >
        {backHref ? (
          <Link href={backHref} className="absolute left-4 top-[calc(env(safe-area-inset-top,0px)+1rem)] z-10 inline-flex min-h-11 items-center font-sans text-sm text-paper md:hidden">
            ‹ {tx("Network")}
          </Link>
        ) : null}
      </div>
      <div className="relative z-10 flex items-end justify-between px-5">
        <div className="-mt-11">
          <span className="relative z-10 inline-grid rounded-full shadow-[0_0_0_4px_#FFFDF8]">
            <Avatar initials={member.initials} photoId={member.photoId} size="lg" />
          </span>
        </div>
        <div className="mb-2 flex gap-2">
          {isSelf || messagingClosed ? null : intro === "ACCEPTED" || connection === "ACCEPTED" ? (
            <form action={openConversation}>
              <input type="hidden" name="userId" value={member.id} />
              <button className={btn} type="submit">
                {tx("Open messages")}
              </button>
            </form>
          ) : intro === "PENDING" ? (
            <span className={`${btn} pointer-events-none bg-mut`}>{tx("Introduction requested")}</span>
          ) : intro === "INCOMING" ? (
            <Link href="/network" className={btn}>
              {tx("Respond")}
            </Link>
          ) : null}
        </div>
      </div>
      <div className="px-5 pb-6 sm:px-7">
        <h1 className="mt-3 flex flex-wrap items-center gap-2 font-serif text-[26px] font-normal">
          {member.name} <TierBadge tier={member.tier} />
        </h1>
        <p className="mt-1 text-sm text-mut">
          {member.org} · {member.location}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-sm bg-brass px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-paper">
            {tx(roleShort(roleLabel(member.role)))}
          </span>
          {/* #42: the other categories this member also covers. */}
          {memberCategories(member).slice(categoryForRole(member.role) ? 1 : 0).map((id) => (
            <span key={id} className="rounded-sm border border-brass px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-forest" data-testid={`member-category-${id}`}>
              {tx(seekLabel(id))}
            </span>
          ))}
          {/* #42 review: only the member sees their own pending categories. */}
          {isSelf
            ? parseSeeking(member.pendingCategories ?? "").map((id) => (
                <span key={id} className="rounded-sm border border-dashed border-brass px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-mut" data-testid={`member-category-pending-${id}`}>
                  {tx(seekLabel(id))} · {tx("Pending staff review")}
                </span>
              ))
            : null}
          <span className="rounded-sm border border-line px-2.5 py-1 text-[11px] text-mut">
            {tx("Member since")} {member.createdAt.getFullYear()}
          </span>
        </div>
        {member.bio ? <p className="mt-4 text-sm leading-relaxed text-ink">{member.bio}</p> : null}
        <dl className="mt-3 grid gap-2 text-sm text-ink">
          {member.markets ? (
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-mut">{tx("Markets")}</dt>
              <dd>{member.markets}</dd>
            </div>
          ) : null}
          {member.dealTypes ? (
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-mut">{tx("Deal types")}</dt>
              <dd>{member.dealTypes}</dd>
            </div>
          ) : null}
          {member.assetClasses ? (
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-mut">{tx("Asset classes")}</dt>
              <dd>{member.assetClasses}</dd>
            </div>
          ) : null}
          {member.checkSize ? (
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-mut">{tx("Check or deal size")}</dt>
              <dd>{member.checkSize}</dd>
            </div>
          ) : null}
          {member.offering && member.role !== "DEVELOPER" ? (
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-mut">{tx("About my services")}</dt>
              <dd>{member.offering}</dd>
            </div>
          ) : null}
          {member.website ? (
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-mut">{tx("Website")}</dt>
              <dd>{member.website}</dd>
            </div>
          ) : null}
        </dl>
        {isSelf ? <ProfileEditor member={member} /> : null}
        {isSelf ? null : messagingClosed ? (
          <div className="mt-4 rounded border border-line bg-cream px-3 py-3 text-sm text-ink">
            {tx("Messaging is closed between these members.")}
            {blockedByViewer ? (
              <form action={unblockMember} className="mt-2">
                <input type="hidden" name="userId" value={member.id} />
                <button className={btnOutline} type="submit">
                  {tx("Unblock")}
                </button>
              </form>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {intro === "INCOMING" ? (
              <div className="flex gap-2">
                <form action={respondIntroduction}>
                  <input type="hidden" name="introductionId" value={introductionId} />
                  <button className={btnOutline} name="decision" value="DECLINED" type="submit">
                    {tx("Decline introduction")}
                  </button>
                </form>
                <form action={respondIntroduction}>
                  <input type="hidden" name="introductionId" value={introductionId} />
                  <button className={btn} name="decision" value="ACCEPTED" type="submit">
                    {tx("Accept introduction")}
                  </button>
                </form>
              </div>
            ) : intro === "PENDING" ? (
              <p className="text-sm text-ink">{tx("Your introduction is waiting. Messaging opens after they accept.")}</p>
            ) : intro === "ACCEPTED" || connection === "ACCEPTED" ? (
              <form action={openConversation}>
                <input type="hidden" name="userId" value={member.id} />
                <button className={btn} type="submit">
                  {tx("Open messages")}
                </button>
              </form>
            ) : (
              <p className="rounded border border-line bg-cream px-3 py-3 text-[15px] leading-relaxed text-ink" data-testid="contact-rule">
                {tx("Contact opens through a project that is seeking your category. Private Floor does not allow cold outreach.")}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <form action={blockMember}>
                <input type="hidden" name="userId" value={member.id} />
                <button className={btnOutline} type="submit">
                  {tx("Block")}
                </button>
              </form>
            </div>
            <ReportDialog userId={member.id} label={tx("Report")} />
          </div>
        )}
        <div className="mt-4 grid grid-cols-3 overflow-hidden border-y border-brass-line">
          <Stat value={String(projectCount)} label={tx("Projects")} />
          <Stat value={String(vouchCount)} label={tx("Vouches")} />
          <Stat value={tx(tierLabel(member.tier))} label={tx("Membership")} />
        </div>
        <ProfilePhotos isSelf={isSelf} photoId={member.photoId} coverId={member.coverId} gallery={gallery} />
        <h2 className="mb-2 mt-6 text-[13px] font-semibold uppercase tracking-[0.16em] text-brass">{tx("Membership")}</h2>
        <div className="flex flex-wrap items-center gap-3 rounded border border-line bg-cream px-4 py-3" data-testid="membership-status">
          <span className="inline-flex items-center rounded-sm border border-forest bg-forest px-3 py-1 text-[14px] font-semibold uppercase tracking-[0.08em] text-paper">
            {tx("Approved")}
          </span>
          <span className="text-[16px] leading-relaxed text-ink">{tx("Approved members are in the platform.")}</span>
        </div>
        <h2 className="mb-2 mt-6 text-[13px] font-semibold uppercase tracking-[0.16em] text-brass" data-testid="track-record-title">
          {member.role === "DEVELOPER" ? tx("My Projects") : tx("Past Projects")}
        </h2>
        {projects.length === 0 ? <p className="text-[16px] text-mut">{tx("No projects listed yet.")}</p> : null}
        <ul>
          {projects.map((project) => {
            const confirmed = project.confirmations.filter((item) => item.reviewStatus === "APPROVED").length;
            const pending = project.confirmations.filter(
              (item) => item.status === "PENDING" || item.reviewStatus === "PENDING_ADMIN",
            ).length;
            const seeking = parseSeeking(project.seeking);
            const listed = project.reviewStatus === "APPROVED";
            return (
              <li key={project.id} id={`project-${project.id}`} className="scroll-mt-20 border-b border-line py-3" data-testid="track-project">
                <Link href={`/projects/${project.id}`} className="group flex min-h-12 items-center gap-3 rounded px-1 hover:bg-cream" data-testid="track-project-row">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[17px] font-semibold text-forest underline decoration-brass underline-offset-2">{project.name}</span>
                      {isSelf || listed ? <ReviewChip status={project.reviewStatus} /> : null}
                    </div>
                    <p className="mt-0.5 text-[15px] text-mut">
                      {[tx(project.asset), projectLocation(project) || project.location, String(project.year), project.detailsVisible && project.valueLabel ? formatProjectValue(project.valueLabel) : ""]
                        .filter(Boolean)
                        .join(" · ")}
                      {project.role ? ` · ${tx(fixRoleTypos(project.role))}` : ""}
                      {confirmed ? ` · ${confirmed} ${tx("confirmed")}` : ""}
                      {pending ? ` · ${pending} ${tx("pending")}` : ""}
                    </p>
                  </div>
                  <span aria-hidden className="shrink-0 text-xl text-brass">›</span>
                </Link>
                {isSelf && project.reviewStatus === "NEEDS_INFO" && project.reviewNote ? (
                  <p className="mt-2 rounded border border-brass bg-cream px-3 py-2 text-[15px] leading-relaxed text-ink">
                    <b>{tx("Note from the reviewer:")}</b> {project.reviewNote}
                  </p>
                ) : null}
                {isSelf && canEditProject(project.reviewStatus) ? (
                  <details className="mt-2 rounded border border-line bg-paper p-3" open={project.reviewStatus === "NEEDS_INFO"}>
                    <summary className="cursor-pointer text-[15px] font-semibold text-forest">{tx("Edit and resubmit")}</summary>
                    <div className="mt-3">
                      <ProjectForm back="/profile" project={project} />
                    </div>
                  </details>
                ) : null}
                {isSelf && listed && canOpenProjectToCounterparties(project.verification) ? (
                  <details className="mt-2 rounded border border-line bg-paper p-3">
                    <summary className="cursor-pointer text-[15px] font-semibold text-forest">{tx("Request vouch")}</summary>
                    {project.confirmations.map((item) => (
                      <div key={item.id} className="mt-2 text-[15px] text-ink">
                        <span className="font-semibold">{item.counterpartyName}</span>
                        <span className="text-mut"> · {tx(vouchState(item))}</span>
                        {item.status === "PENDING" ? <CopyLink url={`${linkOrigin}/confirm/${item.token}`} /> : null}
                      </div>
                    ))}
                    <form action={requestConfirmation} className="mt-2 grid gap-2">
                      <input type="hidden" name="projectId" value={project.id} />
                      <p className="text-[14px] leading-relaxed text-mut">
                        {tx("If this person is a member, the request goes to their inbox. Otherwise a portal link appears here. Private Floor does not email it.")}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                        <input name="counterpartyName" placeholder={tx("Counterparty name")} className={`${field} text-[16px]`} required />
                        <input name="counterpartyEmail" type="email" placeholder={tx("Counterparty email, used only to match a member")} className={`${field} text-[16px]`} required />
                        <button className={btnOutline} type="submit">
                          {tx("Request vouch")}
                        </button>
                      </div>
                    </form>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
        {isSelf ? (
          <section id="add-project" className="mt-6 min-w-0 rounded border border-line bg-cream p-5 sm:p-7">
            <h2 className="mb-4 font-serif text-2xl text-forest sm:text-[28px]">{tx("Add a project")}</h2>
            <ProjectForm back="/profile" />
          </section>
        ) : null}
      </div>
    </article>
  );
}

function contactLabel(status: string) {
  if (status === "ACCEPTED") return "Accepted";
  if (status === "DECLINED") return "Declined";
  return "Sent";
}

function vouchState(item: { status: string; reviewStatus: string }) {
  if (item.status === "PENDING") return "portal link ready";
  if (item.status === "DECLINED") return "counterparty declined";
  if (item.reviewStatus === "PENDING_ADMIN") return "confirmed, awaiting administrator review";
  if (item.reviewStatus === "APPROVED") return "vouch accepted";
  if (item.reviewStatus === "REJECTED") return "an administrator did not accept this vouch";
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
