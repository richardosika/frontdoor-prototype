import { syncCrm } from "@/lib/crm";
import { crmStageLabel, csvCell } from "@/lib/crm-stage";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();
  await syncCrm();
  const people = await prisma.crmPerson.findMany({ orderBy: { name: "asc" }, include: { owner: { select: { name: true } } } });
  const header = ["name", "email", "role", "org", "location", "stage", "tags", "do_not_contact", "do_not_contact_reason", "follow_up_at", "follow_up_note", "owner", "invite_code"];
  const lines = [header.join(",")];
  for (const person of people) {
    lines.push(
      [
        person.name,
        person.email,
        person.role,
        person.org,
        person.location,
        crmStageLabel(person.stage),
        person.tags,
        person.doNotContact ? "yes" : "no",
        person.doNotContactReason,
        person.followUpAt ? person.followUpAt.toISOString().slice(0, 10) : "",
        person.followUpNote,
        person.owner?.name || "",
        person.inviteCode,
      ]
        .map((value) => csvCell(value))
        .join(","),
    );
  }
  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=private-floor-people.csv",
    },
  });
}
