"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { tierLabel } from "@/lib/format";

const TABS = [
  { href: "/feed", label: "Feed", icon: "⌂", test: "tab-feed" },
  { href: "/deals", label: "Deals", icon: "◈", test: "tab-deals" },
  { href: "/network", label: "Network", icon: "⚇", test: "tab-network" },
  { href: "/messages", label: "Messages", icon: "✉", test: "tab-messages" },
  { href: "/profile", label: "Profile", icon: "☺", test: "tab-profile" },
];

function active(pathname: string, href: string) {
  if (href === "/feed") return pathname.startsWith("/feed");
  if (href === "/profile") return pathname.startsWith("/profile") || pathname.startsWith("/members");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function showMobileWordmark(pathname: string) {
  return pathname === "/feed" || pathname === "/deals" || pathname === "/network" || pathname === "/messages" || pathname === "/admin";
}

export function Shell({
  user,
  unread,
  children,
}: {
  user: { name: string; initials: string; tier: string; isAdmin: boolean };
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-cream text-forest md:grid md:grid-cols-[84px_minmax(0,1fr)] lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden border-r border-brass bg-forest bg-gradient-to-b from-white/[0.02] to-black/10 text-paper md:flex md:flex-col md:gap-1 md:px-3 md:py-6 lg:px-4 lg:py-7">
        <Link href="/feed" className="mb-8 flex items-center justify-center px-1 lg:justify-start lg:px-2">
          <span className="lg:hidden">
            <Logo tone="paper" compact />
          </span>
          <span className="hidden lg:inline-flex">
            <Logo tone="paper" />
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {TABS.map((tab) => {
            const on = active(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                data-testid={tab.test}
                className={`relative flex items-center justify-center gap-3 rounded-sm px-3 py-3 font-serif text-[17px] lg:justify-start ${
                  on ? "bg-brass/15 font-medium text-paper" : "text-sand hover:bg-paper/10 hover:text-paper"
                }`}
              >
                {on ? <span className="absolute -left-3 top-2.5 bottom-2.5 w-[3px] bg-brass lg:-left-4" /> : null}
                <span className="grid h-6 w-6 place-items-center text-xl">{tab.icon}</span>
                <span className="hidden lg:inline">{tab.label}</span>
                {tab.href === "/messages" && unread > 0 ? (
                  <span className="ml-auto hidden rounded-sm bg-brass px-1.5 text-[10px] font-sans font-bold lg:inline">{unread}</span>
                ) : null}
              </Link>
            );
          })}
          {user.isAdmin ? (
            <Link
              href="/admin"
              className={`relative mt-2 flex items-center justify-center gap-3 rounded-sm px-3 py-3 font-serif text-[17px] lg:justify-start ${
                pathname.startsWith("/admin") ? "bg-brass/15 text-paper" : "text-sand hover:bg-paper/10"
              }`}
            >
              {pathname.startsWith("/admin") ? <span className="absolute -left-3 top-2.5 bottom-2.5 w-[3px] bg-brass lg:-left-4" /> : null}
              <span className="grid h-6 w-6 place-items-center text-lg">▣</span>
              <span className="hidden lg:inline">Admin</span>
            </Link>
          ) : null}
        </nav>
        <div className="mt-4 flex items-center justify-center gap-2 rounded-sm border border-brass/40 p-2 lg:justify-start">
          <Link href="/profile" className="flex items-center gap-2">
            <Avatar initials={user.initials} size="sm" />
            <span className="hidden lg:block">
              <span className="block font-sans text-[13px] font-semibold">{user.name}</span>
              <span className="block font-sans text-[11px] text-sand">{tierLabel(user.tier)} member</span>
            </span>
          </Link>
        </div>
        <form action={logoutAction} className="mt-2">
          <button className="w-full rounded-sm px-3 py-2 text-left font-sans text-xs tracking-wide text-sand [font-variant:all-small-caps] hover:text-paper" type="submit">
            Sign out
          </button>
        </form>
      </aside>

      <div className="min-w-0 pb-[76px] md:pb-0">
        {showMobileWordmark(pathname) ? (
          <header className="flex items-center justify-between bg-forest px-5 py-3 text-paper md:hidden">
            <Logo tone="paper" />
            {user.isAdmin ? (
              <Link href="/admin" className="font-sans text-[11px] uppercase tracking-[0.16em] text-brass-pale">
                Admin
              </Link>
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-full border border-paper/40 text-sm">⌕</span>
            )}
          </header>
        ) : null}
        {children}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-paper px-1 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] md:hidden">
        {TABS.map((tab) => {
          const on = active(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              data-testid={tab.test}
              className={`relative flex-1 text-center font-serif text-[11px] ${on ? "text-forest" : "text-mut"}`}
            >
              <span className="block text-xl leading-none">{tab.icon}</span>
              {tab.label}
              {tab.href === "/messages" && unread > 0 ? (
                <span className="absolute right-[18%] top-0 rounded-sm bg-brass px-1 text-[9px] font-sans font-bold text-paper">{unread}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
