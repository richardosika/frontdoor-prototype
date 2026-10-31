import type { User } from "@prisma/client";
import { withinRateLimit } from "@/lib/help/answer";
import { knowledgeChunks } from "@/lib/help/knowledge";
import { composeMemberAnswer, type ChatResult, type MemberContext } from "@/lib/help/member-chat";
import { completeWithProvider, selectHelpProvider, type ProviderEnv } from "@/lib/help/provider";
import { publishedFaq } from "@/lib/help/store";
import { phrase } from "@/lib/i18n/phrases";
import type { Locale } from "@/lib/i18n/messages";
import { gettingStarted, isDeveloperRole } from "@/lib/member-reach";
import { memberCategories, parseSeeking, seekLabel } from "@/lib/project-contact";
import { prisma } from "@/lib/prisma";
import { roleProfile } from "@/lib/role-profile";
import { roleLabel } from "@/lib/roles";

export async function memberHelpContext(user: User, locale: Locale): Promise<MemberContext> {
  const [mine, outreachSent] = await Promise.all([
    prisma.trackProject.findMany({ where: { userId: user.id }, select: { seeking: true, reviewStatus: true } }),
    prisma.projectContact.count({ where: { fromId: user.id } }),
  ]);
  const items = gettingStarted({
    role: user.role,
    profileDone: user.markets.trim().length > 1 && (user.lookingFor.trim().length > 1 || user.offering.trim().length > 1 || user.bio.trim().length > 1),
    ndaAccepted: Boolean(user.ndaAcceptedAt),
    projectCount: mine.length,
    seekingSet: mine.some((p) => parseSeeking(p.seeking).length > 0),
    approvedProject: mine.some((p) => p.reviewStatus === "APPROVED" && parseSeeking(p.seeking).length > 0),
    projectPending: mine.some((p) => p.reviewStatus === "PENDING_REVIEW" || p.reviewStatus === "NEEDS_INFO"),
    outreachSent,
    hasPhoto: Boolean(user.photoId),
    hasCredential: Boolean(user.licenses?.trim()),
  });
  const next = items.find((i) => !i.done);
  return {
    firstName: user.name.split(" ")[0] || user.name,
    type: roleLabel(user.role),
    isDeveloper: isDeveloperRole(user.role),
    credential: phrase(locale, roleProfile(user.role).credential).toLowerCase(),
    categories: memberCategories(user).map(seekLabel).join(", "),
    nextStep: next ? phrase(locale, next.label) : "",
    done: `${items.filter((i) => i.done).length} / ${items.length}`,
  };
}

export function helpEnv(): ProviderEnv {
  return { HELP_PROVIDER: process.env.HELP_PROVIDER, HELP_MODEL: process.env.HELP_MODEL, OPENAI_API_KEY: process.env.OPENAI_API_KEY, ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY };
}

export async function answerMemberQuestion(input: { question: string; sessionKey: string; user: User; locale: Locale; env?: ProviderEnv }): Promise<ChatResult & { id: string }> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.helpTurn.count({ where: { sessionKey: input.sessionKey, createdAt: { gte: since } } });
  const env = input.env ?? helpEnv();
  const provider = selectHelpProvider(env);
  let result: ChatResult;
  if (!withinRateLimit(recent)) {
    result = { answer: phrase(input.locale, "Help is pausing for a bit. Please try again in an hour, or press Send to staff."), escalate: true, kind: "handoff", provider: "keyword" };
  } else {
    const [ctx, faq, history] = await Promise.all([
      memberHelpContext(input.user, input.locale),
      publishedFaq(),
      prisma.helpTurn.findMany({ where: { sessionKey: input.sessionKey }, orderBy: { createdAt: "desc" }, take: 3, select: { question: true, answer: true } }),
    ]);
    result = await composeMemberAnswer({
      question: input.question,
      history: history.reverse(),
      ctx,
      locale: input.locale,
      faq: knowledgeChunks(faq),
      complete: provider === "keyword" ? undefined : (prompt) => completeWithProvider(provider, prompt, env),
    });
  }
  const saved = await prisma.helpTurn.create({
    data: {
      sessionKey: input.sessionKey,
      question: input.question.replace(/\s+/g, " ").trim().slice(0, 800),
      answer: result.answer.slice(0, 4000),
      confidence: result.kind === "answer" ? "high" : result.kind === "refused" ? "refused" : "low",
      unanswered: result.escalate,
      provider: result.provider === "model" ? provider : "keyword",
    },
  });
  return { ...result, id: saved.id };
}

/** Starter questions per member type, in the member's language. */
export function helpChips(isDeveloper: boolean, locale: Locale): string[] {
  const en = isDeveloper
    ? ["How do I add a project?", "What's my next step?", "How do deal rooms work?"]
    : ["How do I express interest in a project?", "What's my next step?", "How do I refer a colleague?"];
  return en.map((q) => phrase(locale, q));
}
