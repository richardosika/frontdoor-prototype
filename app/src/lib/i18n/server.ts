import { cache } from "react";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/messages";
import { phrase } from "@/lib/i18n/phrases";

/**
 * The member's language: the pf_lang cookie on this device, else the language saved on their account, else English.
 * Cached per request.
 */
export const currentLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(value)) return value;
  try {
    const session = await auth();
    if (!session?.user?.id) return DEFAULT_LOCALE;
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { locale: true } });
    return isLocale(user?.locale) ? user.locale : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
});

/** A translator for English UI phrases in server components. */
export async function serverTx(): Promise<(text: string) => string> {
  const locale = await currentLocale();
  return (text) => phrase(locale, text);
}

/** The saved language of a member, for email. */
export async function memberLocale(userId: string | null | undefined): Promise<Locale> {
  if (!userId) return DEFAULT_LOCALE;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { locale: true } }).catch(() => null);
  return isLocale(user?.locale) ? user.locale : DEFAULT_LOCALE;
}
