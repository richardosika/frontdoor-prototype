import { timingSafeEqual } from "node:crypto";
import { runInsuranceReminders } from "@/lib/insurance-reminders";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response(null, { status: 404 });
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return new Response(null, { status: 401 });
  }
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
  const reminders = await runInsuranceReminders({ dryRun });
  return Response.json({ dryRun, reminders }, { headers: { "Cache-Control": "no-store" } });
}
