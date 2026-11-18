import { NextResponse } from "next/server";
import { adminSignInAllowed } from "@/lib/sign-in";
import { currentUser } from "@/lib/current-user";
import { memberExport } from "@/lib/member-export";

export const dynamic = "force-dynamic";

/** Administrator export of one member's data, from the Admin member record. Members no longer export from Settings. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await currentUser();
  if (!admin || admin.status !== "ACTIVE" || !adminSignInAllowed(admin)) {
    return NextResponse.json({ error: "Administrators only." }, { status: 403 });
  }
  const { id } = await context.params;
  const data = await memberExport(id);
  if (!data) return NextResponse.json({ error: "Member not found." }, { status: 404 });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="private-floor-member-${id}.json"`,
      "cache-control": "no-store",
    },
  });
}
