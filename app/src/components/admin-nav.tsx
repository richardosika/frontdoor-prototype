"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_GROUPS, COMMAND_CENTER, adminLinkActive } from "@/lib/admin-home";

function NavLinks({ pathname }: { pathname: string }) {
  const homeOn = adminLinkActive(pathname, COMMAND_CENTER.href);
  return (
    <nav aria-label="Admin">
      <Link
        href={COMMAND_CENTER.href}
        aria-current={homeOn ? "page" : undefined}
        className={`flex min-h-11 items-center rounded-sm px-3 font-serif text-lg ${
          homeOn ? "bg-cream font-medium text-forest" : "text-forest hover:bg-cream"
        }`}
      >
        {COMMAND_CENTER.label}
      </Link>
      {ADMIN_GROUPS.map((group) => (
        <div key={group.label} className="mt-4">
          <p className="px-3 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">{group.label}</p>
          <ul className="mt-1">
            {group.links.map((link) => {
              const on = adminLinkActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={on ? "page" : undefined}
                    className={`flex min-h-11 items-center rounded-sm border-l-2 px-3 text-sm ${
                      on ? "border-brass bg-cream font-semibold text-forest" : "border-transparent text-ink hover:bg-cream"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminSidebar() {
  const pathname = usePathname() || "/admin";
  return (
    <div className="md:sticky md:top-0 md:max-h-dvh md:overflow-y-auto md:border-r md:border-line md:bg-paper md:px-3 md:py-4">
      <div className="border-b border-line bg-paper px-4 py-2 md:hidden">
        <details>
          <summary className="flex min-h-11 cursor-pointer list-none items-center font-serif text-lg text-forest [&::-webkit-details-marker]:hidden">
            Admin menu
          </summary>
          <div className="pb-3">
            <NavLinks pathname={pathname} />
          </div>
        </details>
      </div>
      <div className="hidden md:block">
        <NavLinks pathname={pathname} />
      </div>
    </div>
  );
}
