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

/** A one-time 50% coupon for the first invoice. Test secrets only. */
export async function createIntroCoupon(secret: string): Promise<string | null> {
  if (!secret.startsWith("sk_test")) return null;
  const body = new URLSearchParams();
  body.set("percent_off", "50");
  body.set("duration", "once");
  body.set("name", "First month 50 percent off");
  const created = await stripeForm(secret, "coupons", body);
  if (!created.ok) return null;
  const id = String(created.value.id || "");
  return id || null;
}

export async function cancelStripeAtPeriodEnd(secret: string, subscriptionId: string): Promise<boolean> {
  if (!secret.startsWith("sk_test") || !subscriptionId) return false;
  const body = new URLSearchParams();
  body.set("cancel_at_period_end", "true");
  const updated = await stripeForm(secret, `subscriptions/${encodeURIComponent(subscriptionId)}`, body);
  return updated.ok;
}

export async function createDuesCheckout(input: {
  secret: string;
  /** Full monthly price in cents. The first invoice uses the 50% coupon. Test secrets only. */
  unitAmount: number;
  userId: string;
  email: string;
  customerId: string;
  successUrl: string;
  cancelUrl: string;
  couponId?: string;
}): Promise<StripeResult<{ url: string }>> {
  if (!input.secret.startsWith("sk_test")) return { ok: false, error: "Stripe checkout stays in test mode." };
  if (input.unitAmount <= 0) return { ok: false, error: "Checkout is not used for this role." };
  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("line_items[0][price_data][currency]", "usd");
  body.set("line_items[0][price_data][unit_amount]", String(input.unitAmount));
  body.set("line_items[0][price_data][recurring][interval]", "month");
  body.set("line_items[0][price_data][product_data][name]", "Private Floor Club membership");
  body.set("line_items[0][quantity]", "1");
  body.set("success_url", input.successUrl);
  body.set("cancel_url", input.cancelUrl);
  body.set("client_reference_id", input.userId);
  body.set("metadata[userId]", input.userId);
  body.set("subscription_data[metadata][userId]", input.userId);
  if (input.couponId) body.set("discounts[0][coupon]", input.couponId);
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

async function stripeGet(secret: string, path: string): Promise<StripeResult<Record<string, unknown>>> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${secret}` } });
  const payload = (await response.json()) as { error?: { message?: string } } & Record<string, unknown>;
  if (!response.ok) return { ok: false, error: payload.error?.message || "Stripe request failed." };
  return { ok: true, value: payload };
}

/** A Stripe customer for the member (test mode only). */
export async function ensureStripeCustomer(secret: string, input: { customerId: string; email: string; name: string; userId: string }): Promise<StripeResult<string>> {
  if (!secret.startsWith("sk_test")) return { ok: false, error: "Stripe stays in test mode." };
  if (input.customerId) return { ok: true, value: input.customerId };
  const body = new URLSearchParams({ email: input.email, name: input.name, "metadata[userId]": input.userId });
  const created = await stripeForm(secret, "customers", body);
  return created.ok ? { ok: true, value: String(created.value.id || "") } : created;
}

/** A SetupIntent for the Payment Element: cards plus Apple Pay / Google Pay wallets. No charge is made. */
export async function createSetupIntent(secret: string, customerId: string, userId: string): Promise<StripeResult<{ id: string; clientSecret: string }>> {
  if (!secret.startsWith("sk_test")) return { ok: false, error: "Stripe stays in test mode." };
  const body = new URLSearchParams({ customer: customerId, usage: "off_session", "automatic_payment_methods[enabled]": "true", "metadata[userId]": userId });
  const created = await stripeForm(secret, "setup_intents", body);
  if (!created.ok) return created;
  return { ok: true, value: { id: String(created.value.id || ""), clientSecret: String(created.value.client_secret || "") } };
}

export async function retrieveSetupIntent(secret: string, id: string): Promise<StripeResult<Record<string, unknown>>> {
  return stripeGet(secret, `setup_intents/${encodeURIComponent(id)}?expand[]=payment_method`);
}

export async function setDefaultPaymentMethod(secret: string, customerId: string, paymentMethodId: string, subscriptionId = ""): Promise<boolean> {
  const body = new URLSearchParams({ "invoice_settings[default_payment_method]": paymentMethodId });
  const updated = await stripeForm(secret, `customers/${encodeURIComponent(customerId)}`, body);
  if (subscriptionId) await stripeForm(secret, `subscriptions/${encodeURIComponent(subscriptionId)}`, new URLSearchParams({ default_payment_method: paymentMethodId }));
  return updated.ok;
}

export async function detachPaymentMethod(secret: string, paymentMethodId: string): Promise<boolean> {
  return (await stripeForm(secret, `payment_methods/${encodeURIComponent(paymentMethodId)}/detach`, new URLSearchParams())).ok;
}

/** Pause collection until `resumesAt` (invoices in between are voided), or clear the pause. */
export async function setSubscriptionPause(secret: string, subscriptionId: string, resumesAt: Date | null): Promise<boolean> {
  if (!secret.startsWith("sk_test") || !subscriptionId) return false;
  const body = new URLSearchParams();
  if (resumesAt) {
    body.set("pause_collection[behavior]", "void");
    body.set("pause_collection[resumes_at]", String(Math.floor(resumesAt.getTime() / 1000)));
  } else body.set("pause_collection", "");
  return (await stripeForm(secret, `subscriptions/${encodeURIComponent(subscriptionId)}`, body)).ok;
}

/** Retry an unpaid invoice on another card (the backup). */
export async function payInvoiceWith(secret: string, invoiceId: string, paymentMethodId: string): Promise<boolean> {
  if (!secret.startsWith("sk_test") || !invoiceId || !paymentMethodId) return false;
  return (await stripeForm(secret, `invoices/${encodeURIComponent(invoiceId)}/pay`, new URLSearchParams({ payment_method: paymentMethodId }))).ok;
}
