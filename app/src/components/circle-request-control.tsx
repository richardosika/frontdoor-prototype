import Link from "next/link";
import { requestConnection } from "@/actions/social";
import { SubmitButton } from "@/components/submit-button";
import { btn } from "@/components/ui";
import { subCanReach } from "@/lib/sub-access";

export type CircleState = "NONE" | "PENDING" | "INCOMING" | "ACCEPTED";
type Person = { id: string; role: string; extraCategories?: string | null };
export function circleState(connection: { fromId: string; status: string } | undefined, viewerId: string): CircleState {
  return connection?.status === "ACCEPTED" ? "ACCEPTED" : connection?.status === "PENDING" ? (connection.fromId === viewerId ? "PENDING" : "INCOMING") : "NONE";
}

export function CircleRequestControl({ viewer, member, state, back, prefix, tx }: {
  viewer: Person; member: Person; state: CircleState; back: string; prefix: string; tx: (text: string) => string;
}) {
  if (viewer.id === member.id || !subCanReach(viewer, member)) return null;
  return <div className="mt-2 flex min-w-0 flex-wrap items-center">
    {state === "NONE" ? <form action={requestConnection} className="w-full min-w-0">
      <input type="hidden" name="toId" value={member.id} />
      <input type="hidden" name="back" value={back} />
      <SubmitButton className={`${btn} min-h-11 w-full whitespace-normal`} data-testid={`${prefix}-add-circle`} pendingLabel="Sending request…">{tx("Add to My Circle")}</SubmitButton>
    </form> : state === "PENDING" ? <span className="flex min-h-11 items-center text-[14px] text-mut" data-testid={`${prefix}-pending`}>{tx("Request sent")}</span>
    : state === "INCOMING" ? <Link href="/network" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-forest underline decoration-brass">{tx("Respond")}</Link>
    : <span className="flex min-h-11 items-center text-[14px] text-forest" data-testid={`${prefix}-in-circle`}>{tx("In your circle")}</span>}
  </div>;
}
