/**
 * Nov 10 (Julia's minutes), Membership emails, in her exact wording (EN) with ES, DE and JA:
 * - 30 days before the card on the membership expires.
 * - 2 days before it expires, when no new card is on file.
 * - When a membership payment is declined (sent at once, well within 24 hours).
 * Every notice goes through the Outbox, which delivers only to the test recipient.
 */
export type BillingLocale = "en" | "es" | "de" | "ja";
export type CardNoticeKind = "30" | "2";

const DAY = 24 * 60 * 60 * 1000;

type Copy = { subject: string; lines: string[]; button: string; thanks: string; team: string };

const EXPIRING_30: Record<BillingLocale, Copy> = {
  en: {
    subject: "Your membership card expires in 30 days",
    lines: [
      "The credit card associated with your membership is set to expire in 30 days.",
      "To ensure uninterrupted access to your account and all membership benefits, please update your payment information before {date}.",
      "If you have any questions, we're happy to help.",
    ],
    button: "Update your payment information",
    thanks: "Thank you,",
    team: "The Private Floor Club Team",
  },
  es: {
    subject: "La tarjeta de su membresía vence en 30 días",
    lines: [
      "La tarjeta de crédito asociada a su membresía vencerá en 30 días.",
      "Para mantener el acceso sin interrupciones a su cuenta y a todos los beneficios de la membresía, actualice su información de pago antes del {date}.",
      "Si tiene alguna pregunta, con gusto le ayudamos.",
    ],
    button: "Actualizar su información de pago",
    thanks: "Gracias,",
    team: "El equipo de Private Floor Club",
  },
  de: {
    subject: "Die Karte Ihrer Mitgliedschaft läuft in 30 Tagen ab",
    lines: [
      "Die mit Ihrer Mitgliedschaft verknüpfte Kreditkarte läuft in 30 Tagen ab.",
      "Damit Sie Ihr Konto und alle Vorteile der Mitgliedschaft ohne Unterbrechung nutzen können, aktualisieren Sie bitte Ihre Zahlungsdaten vor dem {date}.",
      "Bei Fragen helfen wir Ihnen gern.",
    ],
    button: "Zahlungsdaten aktualisieren",
    thanks: "Vielen Dank,",
    team: "Ihr Private Floor Club Team",
  },
  ja: {
    subject: "会員登録のカードの有効期限が30日後に切れます",
    lines: [
      "会員登録に紐づくクレジットカードの有効期限が30日後に切れます。",
      "アカウントとすべての会員特典を中断なくご利用いただくため、{date}までにお支払い情報を更新してください。",
      "ご不明な点があれば、お気軽にお問い合わせください。",
    ],
    button: "お支払い情報を更新する",
    thanks: "よろしくお願いいたします。",
    team: "Private Floor Club チーム",
  },
};

const EXPIRING_2: Record<BillingLocale, Copy> = {
  en: {
    subject: "Your membership card expires in the next couple of days",
    lines: [
      "The credit card on file is scheduled to expire in the next couple of days, and we haven't received an updated payment method yet.",
      "If we do not receive the updated information by {date}, your membership access will be paused until billing information is updated.",
      "If you'd like to continue your membership, please take a minute to update your card.",
    ],
    button: "Update your card",
    thanks: "Thank you,",
    team: "The Private Floor Club Team",
  },
  es: {
    subject: "La tarjeta de su membresía vence en los próximos días",
    lines: [
      "La tarjeta de crédito registrada vencerá en los próximos días y aún no hemos recibido un método de pago actualizado.",
      "Si no recibimos la información actualizada antes del {date}, el acceso a su membresía quedará en pausa hasta que se actualicen los datos de facturación.",
      "Si desea continuar con su membresía, tómese un minuto para actualizar su tarjeta.",
    ],
    button: "Actualizar su tarjeta",
    thanks: "Gracias,",
    team: "El equipo de Private Floor Club",
  },
  de: {
    subject: "Die Karte Ihrer Mitgliedschaft läuft in den nächsten Tagen ab",
    lines: [
      "Die hinterlegte Kreditkarte läuft in den nächsten Tagen ab, und wir haben noch keine aktualisierte Zahlungsmethode erhalten.",
      "Wenn wir die aktualisierten Daten nicht bis zum {date} erhalten, wird Ihr Mitgliedszugang pausiert, bis die Zahlungsdaten aktualisiert sind.",
      "Wenn Sie Ihre Mitgliedschaft fortsetzen möchten, nehmen Sie sich bitte kurz Zeit, Ihre Karte zu aktualisieren.",
    ],
    button: "Karte aktualisieren",
    thanks: "Vielen Dank,",
    team: "Ihr Private Floor Club Team",
  },
  ja: {
    subject: "会員登録のカードの有効期限が数日以内に切れます",
    lines: [
      "ご登録のクレジットカードの有効期限が数日以内に切れますが、更新されたお支払い方法をまだ受け取っていません。",
      "{date}までに更新情報が届かない場合、お支払い情報が更新されるまで会員アクセスは一時停止されます。",
      "会員登録を継続される場合は、カード情報の更新をお願いいたします。",
    ],
    button: "カードを更新する",
    thanks: "よろしくお願いいたします。",
    team: "Private Floor Club チーム",
  },
};

const DECLINED: Record<BillingLocale, Copy> = {
  en: {
    subject: "Your membership payment was declined",
    lines: [
      "We attempted to process your membership payment, but the transaction was declined.",
      "This can happen for a variety of reasons, such as an expired card, insufficient funds, or outdated billing information.",
      "To keep your membership active and avoid any interruption in access, please update your payment method at your earliest convenience.",
    ],
    button: "Update your payment method",
    thanks: "Thank you,",
    team: "The Private Floor Club Team",
  },
  es: {
    subject: "El pago de su membresía fue rechazado",
    lines: [
      "Intentamos procesar el pago de su membresía, pero la transacción fue rechazada.",
      "Esto puede ocurrir por varios motivos, como una tarjeta vencida, fondos insuficientes o datos de facturación desactualizados.",
      "Para mantener su membresía activa y evitar interrupciones en el acceso, actualice su método de pago lo antes posible.",
    ],
    button: "Actualizar su método de pago",
    thanks: "Gracias,",
    team: "El equipo de Private Floor Club",
  },
  de: {
    subject: "Ihre Mitgliedszahlung wurde abgelehnt",
    lines: [
      "Wir haben versucht, Ihre Mitgliedszahlung zu verarbeiten, aber die Transaktion wurde abgelehnt.",
      "Das kann verschiedene Gründe haben, zum Beispiel eine abgelaufene Karte, unzureichende Deckung oder veraltete Zahlungsdaten.",
      "Damit Ihre Mitgliedschaft aktiv bleibt und Ihr Zugang nicht unterbrochen wird, aktualisieren Sie bitte so bald wie möglich Ihre Zahlungsmethode.",
    ],
    button: "Zahlungsmethode aktualisieren",
    thanks: "Vielen Dank,",
    team: "Ihr Private Floor Club Team",
  },
  ja: {
    subject: "会費のお支払いが承認されませんでした",
    lines: [
      "会費のお支払いを処理しようとしましたが、取引が承認されませんでした。",
      "カードの有効期限切れ、残高不足、古いお支払い情報など、さまざまな理由で起こることがあります。",
      "会員資格を維持し、アクセスの中断を避けるため、お早めにお支払い方法を更新してください。",
    ],
    button: "お支払い方法を更新する",
    thanks: "よろしくお願いいたします。",
    team: "Private Floor Club チーム",
  },
};

const HI: Record<BillingLocale, (name: string) => string> = {
  en: (n) => `Hi ${n},`,
  es: (n) => `Hola, ${n}:`,
  de: (n) => `Hallo ${n},`,
  ja: (n) => `${n} 様`,
};

const INTL: Record<BillingLocale, string> = { en: "en-US", es: "es-US", de: "de-DE", ja: "ja-JP" };

function asLocale(locale: string | null | undefined): BillingLocale {
  return locale === "es" || locale === "de" || locale === "ja" ? locale : "en";
}

/** The last day a card works: the last day of its expiry month. */
export function cardExpiryDay(expMonth: number, expYear: number): Date {
  // Noon UTC on the last day of the month, so the date reads the same in New York.
  return new Date(Date.UTC(expYear, expMonth, 0, 12));
}

/** The moment the card stops working: midnight after that last day in New York, accounting for daylight saving time. */
export function cardExpiresAt(expMonth: number, expYear: number): Date {
  const midnight = new Date(Date.UTC(expYear, expMonth, 1));
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", timeZoneName: "shortOffset",
  }).formatToParts(midnight).find((part) => part.type === "timeZoneName")!.value;
  const hours = Number(offset.replace("GMT", ""));
  return new Date(midnight.getTime() - hours * 60 * 60 * 1000);
}

export function expiryKey(expMonth: number, expYear: number): string {
  return `${expYear}-${String(expMonth).padStart(2, "0")}`;
}

/**
 * Which card notice is due now, if any. 30 days out, then 2 days out. If both windows were missed (for example the
 * card was added late), only the 2-day notice goes. Nothing after the card has expired.
 */
export function cardNoticeDue(input: { expMonth: number; expYear: number; now: Date; sent: ReadonlySet<CardNoticeKind> }): CardNoticeKind | null {
  if (!Number.isInteger(input.expMonth) || input.expMonth < 1 || input.expMonth > 12 || !Number.isInteger(input.expYear) || input.expYear < 100) return null;
  const end = cardExpiresAt(input.expMonth, input.expYear).getTime();
  const t = input.now.getTime();
  if (t >= end) return null;
  if (t >= end - 2 * DAY) return input.sent.has("2") ? null : "2";
  if (t >= end - 30 * DAY) return input.sent.has("30") || input.sent.has("2") ? null : "30";
  return null;
}

export function formatExpiry(date: Date, locale: string | null | undefined): string {
  return new Intl.DateTimeFormat(INTL[asLocale(locale)], { dateStyle: "long", timeZone: "America/New_York" }).format(date);
}

function build(copy: Copy, locale: BillingLocale, name: string, date: string, link: string): { subject: string; text: string } {
  const lines = copy.lines.map((line) => line.replace("{date}", date));
  return {
    subject: copy.subject,
    text: [HI[locale](name), "", ...lines.flatMap((l) => [l, ""]), copy.button, link, "", copy.thanks, copy.team, ""].join("\n"),
  };
}

export function cardExpiringEmail(kind: CardNoticeKind, input: { locale?: string | null; name: string; expiresOn: Date; link: string }) {
  const locale = asLocale(input.locale);
  return build((kind === "30" ? EXPIRING_30 : EXPIRING_2)[locale], locale, input.name, formatExpiry(input.expiresOn, locale), input.link);
}

export function paymentDeclinedEmail(input: { locale?: string | null; name: string; link: string }) {
  const locale = asLocale(input.locale);
  return build(DECLINED[locale], locale, input.name, "", input.link);
}

export const BILLING_EMAIL_LOCALES: BillingLocale[] = ["en", "es", "de", "ja"];
