import { card } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { parseTrades, subProfileFromJoin, tradeLabel } from "@/lib/trades";

/**
 * Nov 6: subcontractor details for staff (verification file and member page). Shown for review only;
 * the automatic grade does not read them.
 */
export async function SubAdminPanel({ userId, applicationId }: { userId?: string | null; applicationId?: string | null }) {
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true, trades: true, markets: true, metros: true, unionShop: true, prevailingWage: true, licenseNumber: true, licenseState: true, bondingCapacity: true, typicalJobSize: true } })
    : null;
  const application = !user && applicationId ? await prisma.application.findUnique({ where: { id: applicationId }, select: { role: true, joinProfile: true } }) : null;
  if (user?.role !== "SUBCONTRACTOR" && application?.role !== "SUBCONTRACTOR") return null;
  const coi = userId ? await prisma.insuranceCertificate.findUnique({ where: { userId }, select: { fileName: true, sizeBytes: true, uploadedAt: true } }) : null;
  const fromJoin = application ? subProfileFromJoin(application.joinProfile) : {};
  const src = user ?? { trades: "", markets: "", metros: "", unionShop: "", prevailingWage: "", licenseNumber: "", licenseState: "", bondingCapacity: "", typicalJobSize: "", ...fromJoin };
  const yn = (v: string) => (v === "yes" ? "Yes" : v === "no" ? "No" : "Not answered");
  const missing = <span className="font-semibold text-[#9b2c22]">Missing</span>;
  const when = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });
  const trades = parseTrades(src.trades ?? "").map(tradeLabel).join(", ");
  const rows: [string, React.ReactNode][] = [
    ["Trades", trades || missing],
    ["States served", src.markets || missing],
    ["Metro areas", src.metros || "—"],
    ["Typical job size", src.typicalJobSize || "—"],
    ["Union shop", yn(src.unionShop ?? "")],
    ["Prevailing-wage work", yn(src.prevailingWage ?? "")],
    ["Contractor license", src.licenseNumber ? `${src.licenseState || "State not given"} · ${src.licenseNumber}` : missing],
    [
      "Certificate of insurance",
      coi ? (
        <a href={`/api/insurance-certificates/${userId}`} target="_blank" rel="noreferrer" className="font-semibold text-forest underline decoration-brass [overflow-wrap:anywhere]" data-testid="admin-coi-link">
          {coi.fileName} · {Math.max(1, Math.round(coi.sizeBytes / 1024))} KB · uploaded {when.format(coi.uploadedAt)} ET
        </a>
      ) : user ? missing : "Uploaded on the profile after approval",
    ],
    ["Bonding capacity", src.bondingCapacity || "Not given (optional)"],
  ];
  return (
    <section className={`${card} mt-4 border-brass p-4`} data-testid="sub-admin-panel">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Subcontractor details</h2>
      <p className="mt-1 text-sm text-mut">{user ? "From the member's profile." : "From the join form."} Check the license with the state board and the certificate of insurance by hand. These are shown for review; the automatic grade does not use them.</p>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="font-semibold">{label}</dt>
            <dd className="[overflow-wrap:anywhere]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
