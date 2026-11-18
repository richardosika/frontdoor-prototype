/**
 * Nov 17 (Julia, step 59): a subcontractor's Bid Opportunities include trade bid packages sent to them directly
 * (matching trade and state) until they submit a bid, plus open matching packages they were not sent.
 */
type TradeRequest = {
  id: string;
  trade: string;
  status: string;
  dueAt: Date;
  createdAt: Date;
  project: { name: string; location: string };
  requester: { name: string; org: string; role: string | null };
};

type Received = { request: TradeRequest & { bids: { status: string }[] } };

export type TradeOpportunity = TradeRequest & { opportunityStatus: "NEW" | "DRAFT" };

export function splitTradeOpportunities<T extends Received, O extends TradeRequest>(received: T[], open: O[], now: Date): { opportunities: TradeOpportunity[]; toDo: T[] } {
  const receivedIds = new Set(received.map(({ request }) => request.id));
  const opportunities = new Map<string, TradeOpportunity>();
  for (const request of open) {
    if (!receivedIds.has(request.id)) opportunities.set(request.id, { ...request, opportunityStatus: "NEW" });
  }
  const toDo = received.filter(({ request }) => {
    const pending = request.bids.every((bid) => bid.status === "DRAFT");
    if (pending && request.trade && request.status === "OPEN" && request.dueAt > now) {
      opportunities.set(request.id, { ...request, opportunityStatus: request.bids.length ? "DRAFT" : "NEW" });
      return false;
    }
    return pending;
  });
  return { opportunities: [...opportunities.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()), toDo };
}
