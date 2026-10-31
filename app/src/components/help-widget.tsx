"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useTx } from "@/components/locale-context";
import { HELP_EMAIL } from "@/lib/help/answer";

type Turn = { id: string; question: string; answer: string; feedback?: string; escalate?: boolean };

const LINK = /\[([^\]]{1,60})\]\((\/(?:feed|profile|refer|viewers|messages|deals|network|member-nda|settings|alerts)(?:[/#][\w\-/#]*)?)\)/g;

/** Plain text with only [label](/app-page) links turned into links (no HTML from the reply). */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        const parts: React.ReactNode[] = [];
        let last = 0;
        LINK.lastIndex = 0;
        for (let m = LINK.exec(line); m; m = LINK.exec(line)) {
          if (m.index > last) parts.push(line.slice(last, m.index));
          parts.push(<a key={m.index} href={m[2]} className="font-semibold text-forest underline decoration-brass">{m[1]}</a>);
          last = LINK.lastIndex;
        }
        if (last < line.length) parts.push(line.slice(last));
        return <Fragment key={i}>{i ? <br /> : null}{parts}</Fragment>;
      })}
    </>
  );
}

export function HelpWidget() {
  const tx = useTx();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[] | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [member, setMember] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => { body.current?.scrollTo({ top: body.current.scrollHeight }); }, [turns, pending, open]);

  async function load() {
    if (turns) return;
    try {
      const response = await fetch("/api/help");
      const payload = (await response.json()) as { turns?: Turn[]; chips?: string[]; member?: boolean };
      setTurns(payload.turns ?? []);
      setChips(payload.chips ?? []);
      setMember(Boolean(payload.member));
    } catch {
      setTurns([]);
    }
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) await load();
  }

  async function ask(question: string) {
    question = question.trim();
    if (!question || pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/help", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question }) });
      const payload = (await response.json()) as { id?: string; answer?: string; error?: string; escalate?: boolean };
      if (!payload.answer || !payload.id) setError(tx(payload.error || "Help is unavailable right now."));
      else {
        setTurns((current) => [...(current ?? []), { id: payload.id || "", question, answer: payload.answer || "", escalate: Boolean(payload.escalate) }]);
        setDraft("");
      }
    } catch {
      setError(tx("Help is unavailable right now."));
    } finally {
      setPending(false);
    }
  }

  async function escalate(id: string) {
    const response = await fetch("/api/help/escalate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    if (!response.ok) { setError(tx("Help is unavailable right now.")); return; }
    setTurns((current) => (current ?? []).map((turn) => (turn.id === id ? { ...turn, feedback: "staff" } : turn)));
  }

  async function vote(id: string, voteValue: "up" | "down") {
    const response = await fetch("/api/help/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, vote: voteValue }) });
    if (!response.ok) return;
    setTurns((current) => (current ?? []).map((turn) => (turn.id === id ? { ...turn, feedback: voteValue } : turn)));
  }

  const empty = (turns ?? []).length === 0;
  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-3 z-40 md:bottom-6 md:right-6" data-testid="help-widget">
      {open ? (
        <section aria-label={tx("Help")} data-testid="help-panel" className="mb-2 flex max-h-[min(70dvh,36rem)] w-[min(100vw-1.5rem,24rem)] flex-col rounded border border-line bg-paper shadow-[0_18px_50px_rgba(31,58,46,0.18)]">
          <header className="flex items-center justify-between border-b border-line px-3 py-2">
            <h2 className="font-serif text-xl font-normal">{tx("Help")}</h2>
            <button type="button" className="min-h-11 px-2 text-sm" onClick={() => setOpen(false)} data-testid="help-close">{tx("Close")}</button>
          </header>
          <div ref={body} className="flex-1 space-y-3 overflow-y-auto px-3 py-3" data-testid="help-body">
            <p className="text-xs leading-relaxed text-mut">
              {member
                ? tx("Instant answers about how Private Floor works. Not legal, tax, or investment advice. If I can't answer, I can send your question to staff.")
                : `${tx("Answers come from Private Floor's pages. This is not legal, tax, or investment advice.")} ${HELP_EMAIL}`}
            </p>
            {empty && chips.length ? (
              <div className="flex flex-wrap gap-2" data-testid="help-chips">
                {chips.map((chip) => (
                  <button key={chip} type="button" onClick={() => ask(chip)} className="min-h-11 rounded-full border border-brass px-3 text-left text-[13px] text-forest" data-testid="help-chip">{chip}</button>
                ))}
              </div>
            ) : null}
            {(turns ?? []).map((turn) => (
              <article key={turn.id} className="space-y-2 text-sm" data-testid="help-turn">
                <p className="ml-6 rounded-sm bg-cream px-3 py-2 text-forest">{turn.question}</p>
                <p className="mr-4 px-1 leading-relaxed text-ink [overflow-wrap:anywhere]" data-testid="help-answer"><Rich text={turn.answer} /></p>
                {turn.escalate && member ? (
                  turn.feedback === "staff" ? (
                    <p className="px-1 text-[13px] font-semibold text-forest" data-testid="help-escalated">✓ {tx("Sent to staff. Someone will reply by email.")}</p>
                  ) : (
                    <button type="button" onClick={() => escalate(turn.id)} className="min-h-11 rounded-sm border border-forest px-3 text-[13px] font-semibold text-forest" data-testid="help-escalate">{tx("Send to staff")}</button>
                  )
                ) : (
                  <div className="flex gap-2">
                    <button type="button" className="min-h-11 px-2 text-xs underline decoration-brass" onClick={() => vote(turn.id, "up")}>{turn.feedback === "up" ? tx("Helpful") : tx("Thumbs up")}</button>
                    <button type="button" className="min-h-11 px-2 text-xs underline decoration-brass" onClick={() => vote(turn.id, "down")}>{turn.feedback === "down" ? tx("Not helpful") : tx("Thumbs down")}</button>
                  </div>
                )}
              </article>
            ))}
            {pending ? <p className="px-1 text-sm text-mut" data-testid="help-typing">…</p> : null}
            {error ? <p className="text-sm text-brass">{error}</p> : null}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void ask(draft); }} className="flex gap-2 border-t border-line p-2">
            <label className="sr-only" htmlFor="help-question">{tx("Question")}</label>
            <input id="help-question" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} placeholder={tx("Ask a question")} className="min-h-11 min-w-0 flex-1 rounded-sm border border-line bg-paper px-3 text-[16px]" data-testid="help-input" />
            <button type="submit" disabled={pending || !draft.trim()} className="min-h-11 rounded-sm bg-forest px-3 text-sm font-semibold text-paper disabled:opacity-50" data-testid="help-send">{pending ? "…" : tx("Send")}</button>
          </form>
        </section>
      ) : null}
      <button type="button" aria-expanded={open} onClick={toggle} className={`${open ? "hidden" : "flex"} ml-auto min-h-11 items-center rounded-sm bg-forest px-4 font-serif text-lg text-paper shadow-[0_8px_24px_rgba(31,58,46,0.25)]`} data-testid="help-launch">{tx("Help")}</button>
    </div>
  );
}
