"use client";

import { useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { finishCardSetup, startCardSetup } from "@/actions/billing";

type Labels = { add: string; save: string; cancel: string; working: string; saved: string };

const stripes = new Map<string, Promise<Stripe | null>>();

function Inner({ role, labels, onDone }: { role: "PRIMARY" | "BACKUP"; labels: Labels; onDone: (message: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="grid gap-3">
      <PaymentElement options={{ layout: "tabs", wallets: { applePay: "auto", googlePay: "auto" } }} />
      {error ? <p className="text-[14px] text-[#9b2c2c]">{error}</p> : null}
      <button
        type="button"
        disabled={!stripe || busy}
        className="inline-flex min-h-11 items-center justify-center rounded-sm bg-forest px-4 font-sans text-[14px] font-semibold text-paper disabled:opacity-60"
        onClick={async () => {
          if (!stripe || !elements) return;
          setBusy(true);
          setError("");
          const result = await stripe.confirmSetup({ elements, redirect: "if_required", confirmParams: { return_url: `${window.location.origin}/settings#billing` } });
          if (result.error || !result.setupIntent) {
            setError(result.error?.message || "");
            setBusy(false);
            return;
          }
          const saved = await finishCardSetup(result.setupIntent.id, role);
          setBusy(false);
          if (!saved.ok) setError(saved.error || "");
          else onDone(labels.saved);
        }}
      >
        {busy ? labels.working : labels.save}
      </button>
    </div>
  );
}

/** Stripe Payment Element in test mode. Card numbers go straight to Stripe; this app never sees them. */
export function CardSetup({ role, labels }: { role: "PRIMARY" | "BACKUP"; labels: Labels }) {
  const [clientSecret, setClientSecret] = useState("");
  const [key, setKey] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (message) return <p className="text-[15px] text-forest" role="status">{message}</p>;
  if (!clientSecret) {
    return (
      <button
        type="button"
        disabled={busy}
        className="inline-flex min-h-11 items-center justify-center rounded-sm border border-forest px-4 font-sans text-[14px] font-semibold text-forest"
        onClick={async () => {
          setBusy(true);
          const started = await startCardSetup(role);
          setBusy(false);
          if (!started.ok) return setMessage(started.error);
          if (!stripes.has(started.publishableKey)) stripes.set(started.publishableKey, loadStripe(started.publishableKey));
          setKey(started.publishableKey);
          setClientSecret(started.clientSecret);
        }}
      >
        {busy ? labels.working : labels.add}
      </button>
    );
  }
  return (
    <Elements stripe={stripes.get(key) ?? null} options={{ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#1f3a2e", fontFamily: "Georgia, serif" } } }}>
      <Inner
        role={role}
        labels={labels}
        onDone={(text) => {
          setMessage(text);
          window.location.reload();
        }}
      />
    </Elements>
  );
}
