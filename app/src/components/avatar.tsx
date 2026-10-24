export function Avatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "h-[88px] w-[88px] text-[30px]" : size === "sm" ? "h-8 w-8 text-[12px]" : "h-10 w-10 text-sm";
  return (
    <span className={`grid shrink-0 place-items-center rounded-full border border-brass bg-parchment font-serif text-forest ${dim}`}>
      {initials}
    </span>
  );
}
