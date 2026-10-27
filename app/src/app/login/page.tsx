import Link from "next/link";
import { AdminEntryLink } from "@/components/admin-mark";
import { JoinLanguages } from "@/components/join-languages";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { BRAND } from "@/lib/brand";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="min-h-dvh bg-cream md:wash md:flex md:items-center md:justify-center md:px-4 md:py-10">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper text-forest md:min-h-0 md:rounded md:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <div className="safe-top bg-forest px-6 pb-5 md:py-5">
          <Logo tone="paper" />
        </div>
        <div className="px-6 py-6">
        <h1 className="font-serif text-2xl font-normal">Sign in to {BRAND.name}</h1>
        <p className="mb-4 mt-1 text-sm text-ink">Approved members only. Applications under review cannot sign in yet.</p>
        <LoginForm next={params.next} />
        <p className="mt-4 text-center text-sm text-mut">
          <Link className="inline-flex min-h-11 items-center font-semibold text-brass" href="/#request-to-join">Request to join</Link>
        </p>
        <JoinLanguages />
        <p className="mt-2 text-center">
          <AdminEntryLink />
        </p>
        </div>
      </div>
    </main>
  );
}
