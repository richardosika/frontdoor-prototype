"use client";

import { useState } from "react";
import { useLocale } from "@/components/locale-context";
import { formatMoneyDigits, moneyDigits } from "@/lib/money";

/** #33: a dollar amount with a $ prefix, grouped as you type in the member's number format. Submits a plain number. */
export function MoneyInput({ name, defaultValue = "", className = "", required, placeholder }: { name: string; defaultValue?: string; className?: string; required?: boolean; placeholder?: string }) {
  const locale = useLocale();
  const [digits, setDigits] = useState(moneyDigits(defaultValue));
  return (
    <span className="relative block">
      <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-sans text-[17px] text-mut">$</span>
      <input
        className={`${className} pl-8`}
        inputMode="numeric"
        autoComplete="off"
        value={formatMoneyDigits(digits, locale)}
        onChange={(event) => setDigits(event.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 13))}
        placeholder={placeholder ?? formatMoneyDigits("24000000", locale)}
        required={required}
        data-testid={`money-${name}`}
      />
      <input type="hidden" name={name} value={digits} />
    </span>
  );
}
