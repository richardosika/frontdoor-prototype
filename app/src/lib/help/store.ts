import { randomBytes } from "node:crypto";
import { composeAnswer, readHelpCookie, withinRateLimit, type HelpResult } from "@/lib/help/answer";
import { DEFAULT_FAQ, knowledgeChunks, type FaqArticle } from "@/lib/help/knowledge";
import { completeWithProvider, selectHelpProvider, type ProviderEnv } from "@/lib/help/provider";
import { prisma } from "@/lib/prisma";

export const HELP_COOKIE = "pf_help";

export function newHelpSession(): string {
  return randomBytes(18).toString("base64url");
}

export function sessionFromHeader(header: string | null): string {
  const existing = readHelpCookie(header, HELP_COOKIE);
  return existing.length >= 16 ? existing : "";
}

export async function ensureHelpArticles() {
  for (const article of DEFAULT_FAQ) {
    const existing = await prisma.helpArticle.findUnique({ where: { slug: article.slug } });
    if (existing) continue;
    await prisma.helpArticle.create({
      data: { slug: article.slug, title: article.title, body: article.body, published: true },
    });
  }
}

export async function publishedFaq(): Promise<FaqArticle[]> {
  await ensureHelpArticles();
  const rows = await prisma.helpArticle.findMany({ where: { published: true }, orderBy: { title: "asc" } });
  return rows.map((row) => ({ slug: row.slug, title: row.title, body: row.body, published: row.published }));
}

export async function answerQuestion(input: {
  question: string;
  sessionKey: string;
  env?: ProviderEnv;
}): Promise<HelpResult & { id: string }> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.helpTurn.count({ where: { sessionKey: input.sessionKey, createdAt: { gte: since } } });
  if (!withinRateLimit(recent)) {
    const saved = await prisma.helpTurn.create({
      data: {
        sessionKey: input.sessionKey,
        question: input.question.slice(0, 800),
        answer: "Help is pausing for a bit. Please try again in an hour, or email connect@privatefloorclub.com.",
        confidence: "low",
        unanswered: true,
        provider: "keyword",
      },
    });
    return {
      id: saved.id,
      answer: saved.answer,
      confidence: "low",
      unanswered: true,
      provider: "keyword",
    };
  }
  const faq = await publishedFaq();
  const chunks = knowledgeChunks(faq);
  const history = await prisma.helpTurn.findMany({
    where: { sessionKey: input.sessionKey },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { question: true, answer: true },
  });
  const env: ProviderEnv = input.env ?? {
    HELP_PROVIDER: process.env.HELP_PROVIDER,
    HELP_MODEL: process.env.HELP_MODEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  };
  const provider = selectHelpProvider(env);
  const result = await composeAnswer({
    question: input.question,
    history: history.reverse(),
    chunks,
    complete:
      provider === "keyword"
        ? undefined
        : (prompt) => completeWithProvider(provider, prompt, env),
  });
  const saved = await prisma.helpTurn.create({
    data: {
      sessionKey: input.sessionKey,
      question: input.question.replace(/\s+/g, " ").trim().slice(0, 800),
      answer: result.answer.slice(0, 4000),
      confidence: result.confidence,
      unanswered: result.unanswered,
      provider: result.provider === "model" ? provider : "keyword",
    },
  });
  return { ...result, provider: result.provider, id: saved.id };
}
