import { activatePaidMembership, claimPaymentEvent, markPaymentFailed } from "@/lib/payment-record";
import { renewalInOneMonth, verifyStripeSignature } from "@/lib/payments";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function userIdFrom(object: Record<string, unknown>): string {
  const meta = object.metadata as { userId?: string } | undefined;
  return String(meta?.userId || object.client_reference_id || "");
}

function renewalFromInvoice(object: Record<string, unknown>): Date {
  const lines = object.lines as { data?: { period?: { end?: number } }[] } | undefined;
  const end = lines?.data?.[0]?.period?.end;
  if (typeof end === "number") return new Date(end * 1000);
  return renewalInOneMonth();
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!verifyStripeSignature(payload, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }
  const event = JSON.parse(payload) as { id?: string; type?: string; data?: { object?: Record<string, unknown> } };
  const eventId = String(event.id || "");
  const object = event.data?.object || {};
  const userId = userIdFrom(object);
  if (!eventId) return NextResponse.json({ received: true });
  const claimed = await claimPaymentEvent(eventId, userId || null, event.type || "stripe");
  if (!claimed) return NextResponse.json({ received: true, duplicate: true });

  if (event.type === "checkout.session.completed") {
    const status = String(object.status || "");
    const paid = status === "complete";
    if (paid && userId) {
      await activatePaidMembership({
        userId,
        mode: "stripe",
        renewalAt: renewalInOneMonth(),
        stripeCustomerId: String(object.customer || ""),
        stripeSubscriptionId: String(object.subscription || ""),
        welcome: true,
      });
    }
  }
  if (event.type === "invoice.paid" && userId) {
    await activatePaidMembership({
      userId,
      mode: "stripe",
      renewalAt: renewalFromInvoice(object),
      stripeCustomerId: String(object.customer || ""),
      stripeSubscriptionId: String(object.subscription || ""),
        welcome: true,
    });
  }
  if (event.type === "invoice.payment_failed" && userId) {
    await markPaymentFailed(userId);
  }
  return NextResponse.json({ received: true });
}
