/** Small markdown renderer for the in-app legal drafts. Headings, paragraphs, and lists only. */
export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (!list.length) return;
    html.push(`<ul class="mt-3 list-disc space-y-1 pl-5">${list.join("")}</ul>`);
    list = [];
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    if (trimmed.startsWith("- ")) {
      list.push(`<li>${inline(trimmed.slice(2))}</li>`);
      continue;
    }
    flush();
    if (trimmed.startsWith("### ")) html.push(`<h3 class="mt-6 font-serif text-xl font-normal">${inline(trimmed.slice(4))}</h3>`);
    else if (trimmed.startsWith("## ")) html.push(`<h2 class="mt-6 font-serif text-2xl font-normal">${inline(trimmed.slice(3))}</h2>`);
    else if (trimmed.startsWith("# ")) html.push(`<h1 class="font-serif text-3xl font-normal">${inline(trimmed.slice(2))}</h1>`);
    else html.push(`<p class="mt-3 text-sm leading-relaxed text-ink">${inline(trimmed)}</p>`);
  }
  flush();
  return html.join("");
}

function inline(value: string): string {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
