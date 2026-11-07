import Link from "next/link";

/** Brass shield used for the administrator entrance and the signed-in admin nav. */
export function AdminMark({ className = "h-4 w-4 text-brass" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path strokeLinejoin="round" d="M12 3.2 5.2 6.1v5.7c0 4.1 2.7 7.2 6.8 8.8 4.1-1.6 6.8-4.7 6.8-8.8V6.1L12 3.2Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.1 11.1 14.2 15.2 10" />
    </svg>
  );
}

export function AdminEntryLink({ className = "" }: { className?: string }) {
  return (
    <Link href="/admin/login" className={`inline-flex min-h-11 items-center gap-1.5 text-xs text-mut hover:text-forest ${className}`}>
      <AdminMark className="h-3.5 w-3.5 text-brass" />
      Admin
    </Link>
  );
}
