import { checkoutIsPaid } from "@/lib/payments";

type StripeResult<T> = { ok: true; value: T } | { ok: false; error: string };

async function stripeForm(secret: string, path: string, body: URLSearchParams): Promise<StripeResult<Record<string, unknown>>> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = (await response.json()) as { error?: { message?: string } } & Record<string, unknown>;
  if (!response.ok) return { ok: false, error: payload.error?.message || "Stripe did not start checkout." };
  return { ok: true, value: payload };
}

export async function createDuesCheckout(input: {
  secret: string;
  priceId: string;
  userId: string;
  email: string;
  customerId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<StripeResult<{ url: string }>> {
  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("line_items[0][price]", input.priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("success_url", input.successUrl);
  body.set("cancel_url", input.cancelUrl);
  body.set("client_reference_id", input.userId);
  body.set("metadata[userId]", input.userId);
  body.set("subscription_data[metadata][userId]", input.userId);
  if (input.customerId) body.set("customer", input.customerId);
  else body.set("customer_email", input.email);
  const created = await stripeForm(input.secret, "checkout/sessions", body);
  if (!created.ok) return created;
  const url = String(created.value.url || "");
  if (!url.startsWith("https://")) return { ok: false, error: "Stripe did not return a checkout link." };
  return { ok: true, value: { url } };
}

export async function retrieveCheckoutSession(secret: string, sessionId: string): Promise<StripeResult<Record<string, unknown>>> {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const payload = (await response.json()) as { error?: { message?: string } } & Record<string, unknown>;
  if (!response.ok) return { ok: false, error: payload.error?.message || "Stripe did not return that session." };
  return { ok: true, value: payload };
}

export async function createBillingPortal(input: { secret: string; customerId: string; returnUrl: string }): Promise<StripeResult<{ url: string }>> {
  const body = new URLSearchParams();
  body.set("customer", input.customerId);
  body.set("return_url", input.returnUrl);
  const created = await stripeForm(input.secret, "billing_portal/sessions", body);
  if (!created.ok) return created;
  const url = String(created.value.url || "");
  if (!url.startsWith("https://")) return { ok: false, error: "Stripe did not return a billing link." };
  return { ok: true, value: { url } };
}

export function sessionUserId(session: Record<string, unknown>): string {
  const meta = session.metadata as { userId?: string } | undefined;
  return String(meta?.userId || session.client_reference_id || "");
}

export function sessionPaid(session: Record<string, unknown>): boolean {
  return checkoutIsPaid({
    mode: String(session.mode || ""),
    status: String(session.status || ""),
    payment_status: String(session.payment_status || ""),
  });
}
