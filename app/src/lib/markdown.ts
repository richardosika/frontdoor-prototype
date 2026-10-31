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
    else if (trimmed.startsWith("## ")) {
      const anchor = /\s*\{#([a-z0-9-]+)\}\s*$/.exec(trimmed);
      const text = anchor ? trimmed.slice(3, anchor.index) : trimmed.slice(3);
      html.push(`<h2${anchor ? ` id="${anchor[1]}"` : ""} class="mt-6 scroll-mt-6 font-serif text-2xl font-normal">${inline(text)}</h2>`);
    }
    else if (trimmed.startsWith("# ")) html.push(`<h1 class="font-serif text-3xl font-normal">${inline(trimmed.slice(2))}</h1>`);
    else html.push(`<p class="mt-3 text-sm leading-relaxed text-ink">${inline(trimmed)}</p>`);
  }
  flush();
  return html.join("");
}

function inline(value: string): string {
  const formatted = escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return wrapDraftMarkers(formatted);
}

/** Real bracketed draft text, such as [to be formed], stays visible and is marked as a draft. */
function wrapDraftMarkers(value: string): string {
  let out = "";
  let index = 0;
  while (index < value.length) {
    if (value[index] !== "[") {
      out += value[index];
      index += 1;
      continue;
    }
    let depth = 0;
    let end = index;
    for (; end < value.length; end += 1) {
      if (value[end] === "[") depth += 1;
      else if (value[end] === "]") {
        depth -= 1;
        if (depth === 0) {
          end += 1;
          break;
        }
      }
    }
    if (depth !== 0) {
      out += value[index];
      index += 1;
      continue;
    }
    const marker = value.slice(index, end);
    out += `<span class="mx-0.5 inline rounded-sm border border-brass bg-brass-soft px-1 text-forest">${marker}</span>`;
    index = end;
  }
  return out;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
