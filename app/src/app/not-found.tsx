import { auth } from "@/auth";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function NotFound() {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const href = signedIn ? "/feed" : "/";
  const label = signedIn ? "Back to the feed" : "Back to home";
  return (
    <main className="grid min-h-dvh place-items-center bg-cream px-6 text-center text-forest">
      <div>
        <h1 className="font-serif text-3xl">That page is not on {BRAND.name}.</h1>
        <p className="mt-2 text-sm text-ink">The page you asked for is not here.</p>
        <a href={href} className="mt-4 inline-block text-sm font-semibold text-brass">
          {label}
        </a>
      </div>
    </main>
  );
}
