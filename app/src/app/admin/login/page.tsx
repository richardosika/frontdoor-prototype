import Link from "next/link";
import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { memberLoginHref } from "@/lib/session-gate";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await auth();
  return (
    <main className="min-h-dvh bg-cream md:wash md:flex md:items-center md:justify-center md:px-4 md:py-10">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper text-forest md:min-h-0 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <div className="safe-top bg-forest px-6 pb-5 md:py-5">
          <Logo tone="paper" />
        </div>
        <div className="px-6 py-6">
          <h1 className="font-serif text-2xl font-normal">Private Floor administrator</h1>
          <p className="mb-4 mt-1 text-sm text-ink">
            Richard Osika signs in here. The browser prompt before this page is the site gate, username privatefloor. Marcus Hale is a demo member and cannot open this page.
          </p>
          <LoginForm portal="admin" />
          <p className="mt-4 text-center text-sm text-mut">
            <Link className="inline-flex min-h-11 items-center text-brass" href={memberLoginHref(Boolean(session?.user))}>
              Member sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
