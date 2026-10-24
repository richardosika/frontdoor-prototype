export function Banner({ error, notice }: { error?: string; notice?: string }) {
  if (error) {
    return <p className="mb-4 rounded border border-brass bg-brass-soft px-3 py-2 text-sm text-forest">{error}</p>;
  }
  if (notice) {
    return <p className="mb-4 rounded border border-line bg-paper px-3 py-2 text-sm text-ink">{notice}</p>;
  }
  return null;
}
