import Link from "next/link";

const LINKS = [
  ["/admin", "Dashboard"],
  ["/admin/applications", "Applications"],
  ["/admin/outbox", "Outbox"],
  ["/admin/audit", "Audit log"],
  ["/admin/test", "Test console"],
  ["/admin/sources", "Verification settings"],
  ["/admin/verification", "Verification files"],
  ["/admin/members", "Members"],
] as const;

export function AdminNav({ current }: { current?: string }) {
  return (
    <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 text-xs">
      {LINKS.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className={`inline-flex min-h-11 shrink-0 items-center rounded-sm border px-3 ${
            current === href ? "border-brass bg-forest text-paper" : "border-line bg-paper text-forest"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
