"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { BRAND } from "@/lib/brand";
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
    <div className="min-h-dvh bg-mist text-navy md:grid md:grid-cols-[84px_minmax(0,1fr)] lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden bg-navy text-white md:flex md:flex-col md:gap-1 md:px-3 md:py-5 lg:px-4 lg:py-6">
        <Link href="/feed" className="mb-6 flex items-center gap-3 px-2 text-white lg:px-3">
          <Logo light compact />
          <span className="hidden font-serif text-[17px] uppercase tracking-[0.18em] lg:inline">{BRAND.short}</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {TABS.map((tab) => {
            const on = active(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                data-testid={tab.test}
                className={`relative flex items-center justify-center gap-3 rounded-xl px-3 py-3 text-[15px] lg:justify-start ${
                  on ? "bg-terra/20 font-semibold text-white" : "text-[#C4CCDD] hover:bg-white/10 hover:text-white"
                }`}
              >
                {on ? <span className="absolute -left-3 top-2.5 bottom-2.5 w-[3px] rounded-r bg-terra lg:-left-4" /> : null}
                <span className="grid h-6 w-6 place-items-center text-xl">{tab.icon}</span>
                <span className="hidden lg:inline">{tab.label}</span>
                {tab.href === "/messages" && unread > 0 ? (
                  <span className="ml-auto hidden rounded-full bg-terra px-1.5 text-[10px] font-bold lg:inline">{unread}</span>
                ) : null}
              </Link>
            );
          })}
          {user.isAdmin ? (
            <Link
              href="/admin"
              className={`mt-2 flex items-center justify-center gap-3 rounded-xl px-3 py-3 text-[15px] lg:justify-start ${
                pathname.startsWith("/admin") ? "bg-white/10 text-white" : "text-[#C4CCDD] hover:bg-white/10"
              }`}
            >
              <span className="grid h-6 w-6 place-items-center text-lg">▣</span>
              <span className="hidden lg:inline">Admin</span>
            </Link>
          ) : null}
        </nav>
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/15 p-2 lg:justify-start">
          <Link href="/profile" className="flex items-center gap-2">
            <Avatar initials={user.initials} size="sm" />
            <span className="hidden lg:block">
              <span className="block text-[13px] font-semibold">{user.name}</span>
              <span className="block text-[11px] text-[#C4CCDD]">{tierLabel(user.tier)} member</span>
            </span>
          </Link>
        </div>
        <form action={logoutAction} className="mt-2">
          <button className="w-full rounded-xl px-3 py-2 text-left text-xs text-[#C4CCDD] hover:text-white" type="submit">
            Sign out
          </button>
        </form>
      </aside>

      <div className="min-w-0 pb-[76px] md:pb-0">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-white px-1 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] md:hidden">
        {TABS.map((tab) => {
          const on = active(pathname, tab.href);
          return (
            <Link key={tab.href} href={tab.href} data-testid={tab.test} className={`relative flex-1 text-center text-[10px] ${on ? "font-semibold text-navy" : "text-mut"}`}>
              <span className="block text-xl leading-none">{tab.icon}</span>
              {tab.label}
              {tab.href === "/messages" && unread > 0 ? (
                <span className="absolute right-[18%] top-0 rounded-full bg-terra px-1 text-[9px] font-bold text-white">{unread}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
