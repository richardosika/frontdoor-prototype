import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_80%_10%,#2A4272,transparent_55%),#14213D] px-4 py-10">
      <div className="w-full max-w-md rounded-[22px] bg-white p-6 text-navy shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <Logo />
        <h1 className="mt-5 font-serif text-2xl font-normal">Sign in</h1>
        <p className="mb-4 mt-1 text-sm text-ink">Approved members only. Applications under review cannot sign in yet.</p>
        <LoginForm next={params.next} />
        <p className="mt-4 text-center text-sm text-mut">
          Have an invite? <Link className="font-semibold text-terra" href="/apply">Apply</Link>
        </p>
        <div className="mt-5 rounded-xl bg-mist p-3 text-xs leading-relaxed text-ink">
          <b>Demo</b>
          <br />
          marcus.hale@halerow.example
          <br />
          password <span className="font-semibold">frontdoor-demo</span> (admin)
        </div>
      </div>
    </main>
  );
}
