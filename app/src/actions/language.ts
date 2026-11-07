"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/messages";

/** Saves the member's language on this device and on their account, so email uses it too. */
export async function setLanguage(formData: FormData) {
  const value = formData.get("locale");
  if (!isLocale(value)) return;
  (await cookies()).set(LOCALE_COOKIE, value, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: false });
  const session = await auth();
  if (session?.user?.id) {
    await prisma.user.update({ where: { id: session.user.id }, data: { locale: value } }).catch(() => {
      console.error("Could not save the member language");
    });
  }
  revalidatePath("/", "layout");
}
