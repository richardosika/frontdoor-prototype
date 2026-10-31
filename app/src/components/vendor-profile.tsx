import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { ProfilePhotos } from "@/components/profile-photos";
import { ReportDialog } from "@/components/report-dialog";
import { ReachOut, StatusPill, type ReachProject } from "@/components/reach-out";
import { btnOutline } from "@/components/ui";
import { blockMember, openConversation, unblockMember } from "@/actions/social";
import { coverageSummary, type Coverage } from "@/lib/insurance";
import { serverTx } from "@/lib/i18n/server";
import { roleProfile } from "@/lib/role-profile";
import { roleLabel, roleShort } from "@/lib/roles";
import { fixRoleTypos, formatProjectValue, projectLocation } from "@/lib/project-contact";

type Member = {
  id: string;
  name: string;
  initials: string;
  photoId: string;
  coverId: string;
  org: string;
  location: string;
  role: string;
  bio: string;
  website: string;
  markets: string;
  assetClasses: string;
  checkSize: string;
  offering: string;
  yearsInBusiness?: string;
  typicalJobSize?: string;
  licenses?: string;
  insuranceInfo?: string;
  insuranceCoverage?: Coverage[];
  specialties?: string;
};
type PastProject = { id: string; name: string; asset: string; location: string; city: string; state: string; year: number; valueLabel: string; role: string; detailsVisible: boolean; reviewStatus: string };

const h2 = "mb-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-brass";

/** #38: a member's profile seen by someone else, laid out like a vendor page. */
export async function VendorProfile({
  member,
  projects,
  gallery,
  reach,
  canMessage,
  blockedByViewer,
  blockedByThem,
  reviewed,
}: {
  member: Member;
  projects: PastProject[];
  gallery: { id: string; caption: string; width: number; height: number }[];
  reach: ReachProject[];
  canMessage: boolean;
  blockedByViewer: boolean;
  blockedByThem: boolean;
  reviewed: boolean;
}) {
  const tx = await serverTx();
  const closed = blockedByViewer || blockedByThem;
  const type = tx(roleShort(roleLabel(member.role)));
  const rp = roleProfile(member.role);
  const facts = [
    [rp.specialties, member.specialties ?? ""],
    ["Markets", member.markets],
    ["Asset classes", member.assetClasses],
    ["Years in business", member.yearsInBusiness ?? ""],
    [rp.size, member.typicalJobSize || member.checkSize],
    [rp.credential, member.licenses ?? ""],
    ["Insurance", [coverageSummary(member.insuranceCoverage ?? [], tx), member.insuranceInfo ?? ""].filter(Boolean).join(" · ")],
  ].filter(([, value]) => value);
  const contacted = reach.filter((project) => project.status);
  return (
    <article className="border-x border-b border-line bg-paper md:overflow-hidden md:rounded md:border" data-testid="vendor-profile">
      <div
        className="cover-forest relative h-32 bg-forest bg-cover bg-center sm:h-44"
        style={member.coverId ? { backgroundImage: `url(/api/member-images/${member.coverId})` } : undefined}
        data-testid={member.coverId ? "profile-cover" : undefined}
      >
        <details className="absolute right-3 top-3 z-20" data-testid="profile-more">
          <summary aria-label={tx("More")} className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-full bg-paper/90 text-xl leading-none text-forest shadow [&::-webkit-details-marker]:hidden">
            ⋯
          </summary>
          <div className="absolute right-0 mt-2 grid w-64 gap-2 rounded border border-line bg-paper p-3 shadow-lg">
            {blockedByViewer ? (
              <form action={unblockMember}>
                <input type="hidden" name="userId" value={member.id} />
                <button className={`${btnOutline} w-full`} type="submit">{tx("Unblock")}</button>
              </form>
            ) : (
              <form action={blockMember}>
                <input type="hidden" name="userId" value={member.id} />
                <button className={`${btnOutline} w-full`} type="submit">{tx("Block")}</button>
              </form>
            )}
            <ReportDialog userId={member.id} label={tx("Report")} />
          </div>
        </details>
      </div>
      <div className="px-5 pb-6 sm:px-7">
        <div className="-mt-12 flex flex-wrap items-end justify-between gap-3">
          <span className="relative z-10 inline-grid rounded-full shadow-[0_0_0_4px_#FFFDF8]">
            <Avatar initials={member.initials} photoId={member.photoId} size="lg" />
          </span>
        </div>
        <h1 className="mt-3 font-serif text-[28px] leading-tight text-forest">{member.name}</h1>
        {member.org ? <p className="text-[18px] font-semibold text-ink" data-testid="vendor-company">{member.org}</p> : null}
        <p className="mt-1 text-[15px] text-mut">{[type, member.location].filter(Boolean).join(" · ")}</p>
        {reviewed ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-forest/40 bg-cream px-3 py-1 text-[14px] text-forest" data-testid="vendor-verified">
            <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full bg-forest text-[11px] text-paper">✓</span>
            {tx("Personally reviewed by Private Floor staff")}
          </p>
        ) : null}

        <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:items-start" data-testid="vendor-actions">
          {closed ? (
            <p className="rounded border border-line bg-cream px-3 py-2 text-[15px] text-ink">{tx("Messaging is closed between these members.")}</p>
          ) : (
            <>
              <ReachOut projects={reach} toId={member.id} back={`/members/${member.id}`} primary align="start" label={reach.filter((p) => !p.status).length === 1 ? `${tx("Reach out about")} ${reach.find((p) => !p.status)?.name}` : undefined} />
              {canMessage ? (
                <form action={openConversation}>
                  <input type="hidden" name="userId" value={member.id} />
                  <button className={btnOutline} type="submit">{tx("Open messages")}</button>
                </form>
              ) : null}
            </>
          )}
          {contacted.map((project) => (
            <span key={project.id} className="flex min-h-11 flex-wrap items-center gap-2 text-[14px] text-mut" data-testid="vendor-contacted">
              <StatusPill status={project.status} /> {project.name}
            </span>
          ))}
        </div>

        {member.offering && member.role !== "DEVELOPER" ? (
          <section className="mt-6">
            <h2 className={h2}>{tx("About my services")}</h2>
            <p className="whitespace-pre-line text-[16px] leading-relaxed text-ink">{member.offering}</p>
          </section>
        ) : null}
        {member.bio ? <p className="mt-3 text-[16px] leading-relaxed text-ink">{member.bio}</p> : null}

        {facts.length ? (
          <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-2" data-testid="vendor-facts">
            {facts.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[12px] font-semibold uppercase tracking-[0.12em] text-mut">{tx(label)}</dt>
                <dd className="mt-0.5 text-[16px] text-ink [overflow-wrap:anywhere]">{value}</dd>
              </div>
            ))}
            {member.website ? (
              <div className="min-w-0">
                <dt className="text-[12px] font-semibold uppercase tracking-[0.12em] text-mut">{tx("Website")}</dt>
                <dd className="mt-0.5 text-[16px] text-ink [overflow-wrap:anywhere]">{member.website}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {gallery.length ? (
          <section className="mt-2" data-testid="vendor-gallery">
            <ProfilePhotos isSelf={false} photoId="" coverId="" gallery={gallery} />
          </section>
        ) : null}

        <section className="mt-6">
          <h2 className={h2} data-testid="track-record-title">{member.role === "DEVELOPER" ? tx("My Projects") : tx("Past Projects")}</h2>
          {projects.length === 0 ? <p className="text-[16px] text-mut">{tx("No projects listed yet.")}</p> : null}
          <ul>
            {projects.map((project) => (
              <li key={project.id} className="border-b border-line last:border-0" data-testid="track-project">
                <Link href={`/projects/${project.id}`} className="flex min-h-12 items-center gap-3 rounded px-1 py-2 hover:bg-cream">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-semibold text-forest underline decoration-brass underline-offset-2">{project.name}</span>
                    <span className="block text-[15px] text-mut">
                      {[tx(project.asset), projectLocation(project) || project.location, String(project.year), project.detailsVisible && project.valueLabel ? formatProjectValue(project.valueLabel) : "", project.role ? tx(fixRoleTypos(project.role)) : ""]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span aria-hidden className="shrink-0 text-xl text-brass">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}

