"use client";

import { useState } from "react";
import { HELP_EMAIL } from "@/lib/help/answer";

type Turn = { id: string; question: string; answer: string; feedback?: string };

export function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[] | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (turns) return;
    const response = await fetch("/api/help");
    const payload = (await response.json()) as { turns?: Turn[] };
    setTurns(payload.turns ?? []);
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) await load();
  }

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/help", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const payload = (await response.json()) as { id?: string; answer?: string; error?: string };
      if (!payload.answer || !payload.id) {
        setError(payload.error || "Help is unavailable right now.");
      } else {
        setTurns((current) => [...(current ?? []), { id: payload.id || "", question, answer: payload.answer || "", feedback: "" }]);
        setDraft("");
      }
    } catch {
      setError("Help is unavailable right now.");
    } finally {
      setPending(false);
    }
  }

  async function vote(id: string, voteValue: "up" | "down") {
    const response = await fetch("/api/help/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, vote: voteValue }),
    });
    if (!response.ok) return;
    setTurns((current) => (current ?? []).map((turn) => (turn.id === id ? { ...turn, feedback: voteValue } : turn)));
  }

  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-3 z-40 md:bottom-6 md:right-6">
      {open ? (
        <section
          aria-label="Help"
          className="mb-2 flex max-h-[70dvh] w-[min(100vw-1.5rem,22rem)] flex-col rounded border border-line bg-paper shadow-[0_18px_50px_rgba(31,58,46,0.18)]"
        >
          <header className="flex items-center justify-between border-b border-line px-3 py-2">
            <h2 className="font-serif text-xl font-normal">Help</h2>
            <button type="button" className="min-h-11 px-2 text-sm" onClick={() => setOpen(false)}>
              Close
            </button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            <p className="text-xs leading-relaxed text-mut">
              Answers come from Private Floor&apos;s pages. This is not legal, tax, or investment advice. A person is at {HELP_EMAIL}.
            </p>
            {(turns ?? []).map((turn) => (
              <article key={turn.id} className="space-y-2 text-sm">
                <p className="rounded-sm bg-cream px-3 py-2 text-forest">{turn.question}</p>
                <p className="whitespace-pre-wrap px-1 leading-relaxed text-ink">{turn.answer}</p>
                <div className="flex gap-2">
                  <button type="button" className="min-h-11 px-2 text-xs underline decoration-brass" onClick={() => vote(turn.id, "up")}>
                    {turn.feedback === "up" ? "Helpful" : "Thumbs up"}
                  </button>
                  <button type="button" className="min-h-11 px-2 text-xs underline decoration-brass" onClick={() => vote(turn.id, "down")}>
                    {turn.feedback === "down" ? "Not helpful" : "Thumbs down"}
                  </button>
                </div>
              </article>
            ))}
            {error ? <p className="text-sm text-brass">{error}</p> : null}
          </div>
          <form onSubmit={ask} className="flex gap-2 border-t border-line p-2">
            <label className="sr-only" htmlFor="help-question">
              Question
            </label>
            <input
              id="help-question"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={800}
              placeholder="Ask about signup, dues, posts, or deal rooms"
              className="min-h-11 flex-1 rounded-sm border border-line bg-paper px-3 text-sm"
            />
            <button type="submit" disabled={pending || !draft.trim()} className="min-h-11 rounded-sm bg-forest px-3 text-sm font-semibold text-paper disabled:opacity-50">
              {pending ? "…" : "Send"}
            </button>
          </form>
        </section>
      ) : null}
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="ml-auto flex min-h-11 items-center rounded-sm bg-forest px-4 font-serif text-lg text-paper shadow-[0_8px_24px_rgba(31,58,46,0.25)]"
      >
        Help
      </button>
    </div>
  );
}
