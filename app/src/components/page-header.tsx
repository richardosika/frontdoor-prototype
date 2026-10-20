import Link from "next/link";

export function PageHeader({
  title,
  ledger = false,
  action,
}: {
  title: string;
  ledger?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-4 hidden items-end justify-between border-b-[3px] border-double border-brass pb-3 md:flex">
      <h1 className={ledger ? "font-serif text-[34px] font-normal italic tracking-wide" : "font-serif text-[26px] font-normal uppercase tracking-[0.14em]"}>
        {title}
      </h1>
      {action}
    </header>
  );
}

export function MobileTitle({
  href,
  label,
  title,
}: {
  href: string;
  label: string;
  title: string;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 bg-forest px-4 py-3 text-paper md:hidden">
      <Link href={href} className="font-sans text-sm text-sand">
        ‹ {label}
      </Link>
      <span className="font-serif text-lg uppercase tracking-[0.16em]">{title}</span>
    </header>
  );
}
