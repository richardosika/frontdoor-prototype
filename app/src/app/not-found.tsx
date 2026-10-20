import Link from "next/link";
import { BRAND } from "@/lib/brand";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-mist px-6 text-center text-navy">
      <div>
        <h1 className="font-serif text-3xl">That page is not on {BRAND.short}.</h1>
        <Link href="/feed" className="mt-4 inline-block text-sm font-semibold text-terra">
          Back to the feed
        </Link>
      </div>
    </main>
  );
}
