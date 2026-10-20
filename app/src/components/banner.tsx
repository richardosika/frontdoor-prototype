export function Banner({ error, notice }: { error?: string; notice?: string }) {
  if (error) {
    return <p className="mb-4 rounded-xl border border-terra bg-terraSoft px-3 py-2 text-sm text-navy">{error}</p>;
  }
  if (notice) {
    return <p className="mb-4 rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink">{notice}</p>;
  }
  return null;
}
