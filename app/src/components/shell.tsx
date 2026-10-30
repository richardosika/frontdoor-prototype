"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { AdminMark } from "@/components/admin-mark";
import { Avatar } from "@/components/avatar";
import { DecisionDialogHost } from "@/components/decision-dialog-host";
import { Logo } from "@/components/logo";
import { LocaleProvider } from "@/components/locale-context";
import { tierLabel } from "@/lib/format";
import { setLanguage } from "@/actions/language";
import { phrase } from "@/lib/i18n/phrases";
import { LOCALES, translator, type Locale, type MessageKey } from "@/lib/i18n/messages";

const TABS: { href: string; label: string; key: MessageKey; icon: string; test: string }[] = [
  { href: "/feed", label: "Ledger", key: "nav.ledger", icon: "⌂", test: "tab-feed" },
  { href: "/deals", label: "Deals", key: "nav.deals", icon: "◈", test: "tab-deals" },
  { href: "/network", label: "Network", key: "nav.network", icon: "⚇", test: "tab-network" },
  { href: "/messages", label: "Messages", key: "nav.messages", icon: "✉", test: "tab-messages" },
  { href: "/profile", label: "Profile", key: "nav.profile", icon: "☺", test: "tab-profile" },
];

function LanguagePicker({ locale, label }: { locale: Locale; label: string }) {
  return (
    <form action={setLanguage} className="border-t border-line px-3 py-2" data-testid="language-picker">
      <p className="mb-1 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-mut">{label}</p>
      <div className="grid grid-cols-2 gap-1">
        {LOCALES.map((item) => (
          <button
            key={item.id}
            name="locale"
            value={item.id}
            type="submit"
            lang={item.id}
            aria-pressed={item.id === locale}
            className={`min-h-9 rounded-sm border px-2 text-left font-sans text-[13px] ${item.id === locale ? "border-brass bg-forest text-paper" : "border-line bg-paper text-forest hover:bg-cream"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </form>
  );
}

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
  alerts,
  locale = "en",
  children,
}: {
  user: { name: string; initials: string; tier: string; isAdmin: boolean };
  unread: number;
  alerts: number;
  locale?: Locale;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = translator(locale);
  const memberLine = t("membership.member", { tier: phrase(locale, tierLabel(user.tier)) });
  const [menuOpen, setMenuOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const memberRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!memberOpen) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setMemberOpen(false);
        return;
      }
      if (memberRef.current && !memberRef.current.contains(event.target as Node)) setMemberOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [memberOpen]);
  useEffect(() => setMemberOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <>
    <DecisionDialogHost />
    <div lang={locale} className="min-h-dvh bg-cream text-forest md:grid md:grid-cols-[84px_minmax(0,1fr)] lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden border-r border-brass bg-forest bg-gradient-to-b from-white/[0.02] to-black/10 text-paper md:flex md:flex-col md:gap-1 md:px-3 md:py-6 lg:px-4 lg:py-7">
        <Link href="/feed" className="mb-4 flex items-center justify-center px-1 lg:justify-start lg:px-2">
          <span className="lg:hidden">
            <Logo tone="paper" compact large />
          </span>
          <span className="hidden lg:inline-flex">
            <Logo tone="paper" large />
          </span>
        </Link>
        <div className="mb-3 hidden rounded-sm border border-brass/50 bg-paper/5 px-3 py-2.5 lg:block" data-testid="sidebar-membership">
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-brass">{t("membership.title")}</p>
          <p className="mt-0.5 font-serif text-[16px] text-paper">{memberLine}</p>
          <p className="font-sans text-[12px] text-sand">{t("membership.active")}</p>
        </div>
        <div ref={memberRef} className="relative mb-5">
          <button
            type="button"
            data-testid="member-menu"
            aria-haspopup="menu"
            aria-expanded={memberOpen}
            onClick={() => setMemberOpen((open) => !open)}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-brass/40 p-2 text-left hover:bg-paper/10 lg:justify-start"
          >
            <Avatar initials={user.initials} size="sm" />
            <span className="hidden min-w-0 flex-1 lg:block">
              <span className="block truncate font-sans text-[13px] font-semibold">{user.name}</span>
              <span className="block font-sans text-[11px] text-sand">{memberLine}</span>
            </span>
            <span aria-hidden className={`hidden text-sand transition lg:inline ${memberOpen ? "rotate-180" : ""}`}>▾</span>
          </button>
          {memberOpen ? (
            <div role="menu" className="absolute left-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-sm border border-brass/50 bg-paper text-forest shadow-lg lg:w-full">
              <Link href="/profile" role="menuitem" className="flex min-h-11 items-center px-3 font-sans text-sm font-semibold hover:bg-cream">
                {t("menu.profile")}
              </Link>
              <Link href="/settings" role="menuitem" className="flex min-h-11 items-center border-t border-line px-3 font-sans text-sm font-semibold hover:bg-cream">
                {t("menu.settings")}
              </Link>
              <form action={logoutAction} className="border-t border-line">
                <button role="menuitem" className="min-h-11 w-full px-3 text-left font-sans text-sm font-semibold hover:bg-cream" type="submit">
                  {t("menu.signOut")}
                </button>
              </form>
              <LanguagePicker locale={locale} label={t("menu.language")} />
            </div>
          ) : null}
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {TABS.map((tab) => {
            const on = active(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                data-testid={tab.test}
                className={`relative flex min-h-11 items-center justify-center gap-3 rounded-sm px-3 py-3 font-serif text-[17px] lg:justify-start ${
                  on ? "bg-brass/15 font-medium text-paper" : "text-sand hover:bg-paper/10 hover:text-paper"
                }`}
              >
                {on ? <span className="absolute -left-3 top-2.5 bottom-2.5 w-[3px] bg-brass lg:-left-4" /> : null}
                <span className="grid h-6 w-6 place-items-center text-xl">{tab.icon}</span>
                <span className="hidden lg:inline">{t(tab.key)}</span>
                {tab.href === "/messages" && unread > 0 ? (
                  <span className="ml-auto hidden rounded-sm bg-brass px-1.5 text-[10px] font-sans font-bold lg:inline">{unread}</span>
                ) : null}
              </Link>
            );
          })}
          <Link
            href="/alerts"
            className={`relative mt-2 flex min-h-11 items-center justify-center gap-3 rounded-sm px-3 py-3 font-serif text-[17px] lg:justify-start ${
              pathname.startsWith("/alerts") ? "bg-brass/15 text-paper" : "text-sand hover:bg-paper/10"
            }`}
          >
            {pathname.startsWith("/alerts") ? <span className="absolute -left-3 top-2.5 bottom-2.5 w-[3px] bg-brass lg:-left-4" /> : null}
            <span className="grid h-6 w-6 place-items-center text-lg">◉</span>
            <span className="hidden lg:inline">{t("nav.alerts")}</span>
            {alerts > 0 ? (
              <span className="ml-auto hidden rounded-sm bg-brass px-1.5 text-[10px] font-sans font-bold lg:inline">{alerts}</span>
            ) : null}
          </Link>
          {user.isAdmin ? (
            <Link
              href="/admin"
              className={`relative flex min-h-11 items-center justify-center gap-3 rounded-sm px-3 py-3 font-serif text-[17px] lg:justify-start ${
                pathname.startsWith("/admin") && !pathname.startsWith("/admin/verification") && !pathname.startsWith("/admin/messages") ? "bg-brass/15 text-paper" : "text-sand hover:bg-paper/10"
              }`}
            >
              {pathname.startsWith("/admin") && !pathname.startsWith("/admin/verification") && !pathname.startsWith("/admin/messages") ? <span className="absolute -left-3 top-2.5 bottom-2.5 w-[3px] bg-brass lg:-left-4" /> : null}
              <span className="grid h-6 w-6 place-items-center text-brass">
                <AdminMark className="h-5 w-5" />
              </span>
              <span className="hidden lg:inline">Admin</span>
            </Link>
          ) : null}
          {user.isAdmin ? (
            <Link
              href="/admin/messages"
              className={`relative flex min-h-11 items-center justify-center gap-3 rounded-sm px-3 py-3 font-serif text-[17px] lg:justify-start ${
                pathname.startsWith("/admin/messages") ? "bg-brass/15 text-paper" : "text-sand hover:bg-paper/10"
              }`}
            >
              {pathname.startsWith("/admin/messages") ? <span className="absolute -left-3 top-2.5 bottom-2.5 w-[3px] bg-brass lg:-left-4" /> : null}
              <span className="grid h-6 w-6 place-items-center text-lg">⌕</span>
              <span className="hidden lg:inline">Moderation</span>
            </Link>
          ) : null}
          {user.isAdmin ? (
            <Link
              href="/admin/verification"
              className={`relative flex min-h-11 items-center justify-center gap-3 rounded-sm px-3 py-3 font-serif text-[17px] lg:justify-start ${
                pathname.startsWith("/admin/verification") ? "bg-brass/15 text-paper" : "text-sand hover:bg-paper/10"
              }`}
            >
              {pathname.startsWith("/admin/verification") ? <span className="absolute -left-3 top-2.5 bottom-2.5 w-[3px] bg-brass lg:-left-4" /> : null}
              <span className="grid h-6 w-6 place-items-center text-lg">✓</span>
              <span className="hidden lg:inline">Verification</span>
            </Link>
          ) : null}
        </nav>
      </aside>

      <div className="min-w-0 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        {showMobileWordmark(pathname) ? (
          <header className="safe-top flex items-center justify-between bg-forest px-5 pb-3.5 text-paper md:hidden">
            <Logo tone="paper" />
            <button
              type="button"
              aria-label={t("menu.account")}
              className="relative grid h-11 w-11 place-items-center rounded-full border border-paper/40 font-sans text-xs"
              onClick={() => setMenuOpen(true)}
            >
              {user.initials}
              {alerts > 0 ? (
                <span className="absolute -right-1 -top-1 rounded-sm bg-brass px-1 text-[9px] font-bold text-paper">{alerts}</span>
              ) : null}
            </button>
          </header>
        ) : null}
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-paper px-1 pt-1 pb-[calc(0.35rem+env(safe-area-inset-bottom,0px))] md:hidden">
        {TABS.map((tab) => {
          const on = active(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              data-testid={tab.test}
              className={`relative flex min-h-11 flex-1 flex-col items-center justify-center text-center font-serif text-[11px] ${on ? "text-forest" : "text-mut"}`}
            >
              <span className="block text-xl leading-none">{tab.icon}</span>
              {t(tab.key)}
              {tab.href === "/messages" && unread > 0 ? (
                <span className="absolute right-[18%] top-0 rounded-sm bg-brass px-1 text-[9px] font-sans font-bold text-paper">{unread}</span>
              ) : null}
            </Link>
          );
        })}
        <button
          type="button"
          data-testid="tab-more"
          className="relative flex min-h-11 flex-1 flex-col items-center justify-center font-serif text-[11px] text-mut"
          onClick={() => setMenuOpen(true)}
        >
          <span className="block text-xl leading-none">⋯</span>
          {t("nav.more")}
          {alerts > 0 ? (
            <span className="absolute right-[18%] top-0 rounded-sm bg-brass px-1 text-[9px] font-sans font-bold text-paper">{alerts}</span>
          ) : null}
        </button>
      </nav>
      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" className="absolute inset-0 bg-forest/40" aria-label={t("menu.close")} onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-x-0 bottom-[calc(3.4rem+env(safe-area-inset-bottom,0px))] rounded-t border border-line bg-paper px-4 pb-4 pt-4">
            <p className="font-serif text-lg">{user.name}</p>
            <p className="text-xs text-mut">{memberLine} · {t("membership.active")}</p>
            <Link href="/settings" className="mt-3 flex min-h-11 items-center border-t border-line text-sm font-semibold" onClick={() => setMenuOpen(false)}>
              {t("menu.settings")}
            </Link>
            <Link href="/alerts" className="flex min-h-11 items-center justify-between border-t border-line text-sm font-semibold" onClick={() => setMenuOpen(false)}>
              {t("nav.alerts")}
              {alerts > 0 ? <span className="rounded-sm bg-brass px-1.5 text-[10px] font-bold text-paper">{alerts}</span> : null}
            </Link>
            {user.isAdmin ? (
              <Link href="/admin" className="flex min-h-11 items-center gap-2 border-t border-line text-sm font-semibold" onClick={() => setMenuOpen(false)}>
                <AdminMark className="h-4 w-4 text-brass" />
                Admin
              </Link>
            ) : null}
            {user.isAdmin ? (
              <Link href="/admin/messages" className="flex min-h-11 items-center border-t border-line text-sm font-semibold" onClick={() => setMenuOpen(false)}>
                Moderation
              </Link>
            ) : null}
            {user.isAdmin ? (
              <Link href="/admin/verification" className="flex min-h-11 items-center border-t border-line text-sm font-semibold" onClick={() => setMenuOpen(false)}>
                Verification
              </Link>
            ) : null}
            <form action={logoutAction} className="border-t border-line">
              <button className="min-h-11 w-full text-left text-sm font-semibold" type="submit">
                {t("menu.signOut")}
              </button>
            </form>
            <div className="-mx-4 border-t border-line">
              <LanguagePicker locale={locale} label={t("menu.language")} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </>
  );
}
