export function Avatar({ initials, size = "md", photoId = "" }: { initials: string; size?: "sm" | "md" | "lg"; photoId?: string }) {
  const dim = size === "lg" ? "h-[88px] w-[88px] text-[30px]" : size === "sm" ? "h-8 w-8 text-[12px]" : "h-10 w-10 text-sm";
  if (photoId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/api/member-images/${photoId}`} alt="" className={`shrink-0 rounded-full border border-brass bg-parchment object-cover ${dim}`} data-testid="avatar-photo" />
    );
  }
  return (
    <span className={`grid shrink-0 place-items-center rounded-full border border-brass bg-parchment font-serif text-forest ${dim}`}>
      {initials}
    </span>
  );
}
