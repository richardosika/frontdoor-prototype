import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SEEDED_MEMBER_FILES, SEEDED_PROJECT_FILES } from "@/lib/seed-coherence";

/** Seeded member ids. Administrator password hashes are never written by this cleanup. */
export const SEED_USER_IDS = Object.keys(SEEDED_MEMBER_FILES);

/** Track projects shipped in the seed, including the extra projects aligned on later starts. */
export const SEED_PROJECT_IDS = Object.keys(SEEDED_PROJECT_FILES);

/** Deals and their feed posts shipped in the seed. */
export const SEED_DEAL_IDS = [
  "deal_newark",
  "deal_edison",
  "deal_hoboken",
  "deal_brooklyn",
  "deal_jc",
  "deal_brarch",
  "deal_nzone",
  "deal_edlend",
] as const;

/** Vouches the seed creates. Any other confirmation is testing data, even on a seeded project. */
export const SEED_CONFIRMATION_TOKENS = [
  "demo-ironbound-confirmed",
  "demo-halsey-confirm",
  "demo-nora-confirm",
  "demo-raritan-confirmed",
] as const;

export const DEMO_INVITE_CODE = "PF-7K2M-91QX";
export const DEMO_INVITE_MAX_USES = 40;
export const KEEP_APPLICATION_STATUS_TOKEN = "demo-jordan-ellis-status";
export const KEEP_INVITE_REQUEST_STATUS_TOKEN = "demo-chris-invite-status";

export const CLEAN_TEST_DATA_IGNORED = "CLEAN_TEST_DATA is not 1 or dry. Cleanup skipped.";

const SEED_USERS = new Set(SEED_USER_IDS);
const SEED_PROJECTS = new Set(SEED_PROJECT_IDS);
const SEED_DEALS = new Set<string>(SEED_DEAL_IDS);
const SEED_CONFIRMATIONS = new Set<string>(SEED_CONFIRMATION_TOKENS);

/** Tables this cleanup can remove, in delete order. Help articles, templates, settings, and source cache are absent on purpose. */
export const CLEAN_TABLES = [
  "verification_evidence",
  "verification_run",
  "crm_note",
  "crm_event",
  "crm_person",
  "outbox_notice",
  "help_turn",
  "email_challenge",
  "moderation_event",
  "like",
  "comment",
  "post",
  "deal_message",
  "deal_document",
  "deal_event",
  "deal_access",
  "deal",
  "message",
  "conversation",
  "connection",
  "introduction",
  "report",
  "block",
  "notification",
  "saved_filter",
  "payment_event",
  "legal_acceptance",
  "business_card",
  "application_decision",
  "application",
  "invite_request",
  "invite_code",
  "verification_check",
  "verification_event",
  "verification_case",
  "confirmation",
  "track_project",
  "user",
] as const;

export type CleanTable = (typeof CLEAN_TABLES)[number];
export type IdTable = Exclude<CleanTable, "like">;

export type CleanSnapshot = {
  users: { id: string }[];
  applications: { id: string; statusToken: string; inviteCodeId: string }[];
  applicationDecisions: { id: string; applicationId: string }[];
  inviteRequests: { id: string; statusToken: string }[];
  inviteCodes: { id: string; code: string; uses: number; maxUses: number }[];
  verificationRuns: { id: string }[];
  verificationEvidence: { id: string }[];
  verificationCases: { id: string; userId: string | null; projectId: string | null }[];
  verificationChecks: { id: string; caseId: string }[];
  verificationEvents: { id: string; caseId: string }[];
  trackProjects: { id: string }[];
  confirmations: { id: string; projectId: string; token: string }[];
  deals: { id: string; sponsorId: string }[];
  posts: { id: string; authorId: string; dealId: string | null; isTest: boolean }[];
  likes: { userId: string; postId: string }[];
  comments: { id: string; authorId: string; postId: string }[];
  dealAccess: { id: string; dealId: string; requesterId: string }[];
  dealDocuments: { id: string; dealId: string; authorId: string }[];
  dealMessages: { id: string; dealId: string; authorId: string }[];
  dealEvents: { id: string; dealId: string; actorId: string | null }[];
  conversations: { id: string; userAId: string; userBId: string }[];
  messages: { id: string; conversationId: string }[];
  connections: { id: string; fromId: string; toId: string }[];
  introductions: { id: string; fromId: string; toId: string; isTest: boolean }[];
  notifications: { id: string; userId: string }[];
  savedFilters: { id: string; userId: string }[];
  paymentEvents: { id: string; userId: string | null }[];
  businessCards: { id: string; userId: string | null; applicationId: string | null }[];
  legalAcceptances: { id: string; userId: string | null; applicationId: string | null }[];
  emailChallenges: { id: string }[];
  crmPeople: { id: string }[];
  crmNotes: { id: string }[];
  crmEvents: { id: string }[];
  outboxNotices: { id: string }[];
  helpTurns: { id: string }[];
  reports: { id: string; reporterId: string; targetUserId: string }[];
  blocks: { id: string; blockerId: string; blockedId: string }[];
  moderationEvents: { id: string }[];
};

export type CleanPlan = {
  counts: Record<string, number>;
  ids: Record<IdTable, string[]>;
  likes: { userId: string; postId: string }[];
  inviteDemoReset: boolean;
};

export function cleanTestDataMode(raw: string | undefined): "off" | "dry" | "delete" | "invalid" {
  if (raw == null || raw === "") return "off";
  if (raw === "dry") return "dry";
  if (raw === "1") return "delete";
  return "invalid";
}

function rowIds<T extends { id: string }>(rows: T[]): string[] {
  return rows.map((row) => row.id);
}

function keptCase(row: { userId: string | null; projectId: string | null }): boolean {
  if (row.userId && SEED_USERS.has(row.userId)) return true;
  if (row.projectId && SEED_PROJECTS.has(row.projectId)) return true;
  return false;
}

/** Decides which rows are testing data. Seeded members, projects, deals, the demo application, and the demo invite stay. */
export function planCleanTestData(snapshot: CleanSnapshot): CleanPlan {
  const applicationIds = rowIds(
    snapshot.applications.filter((row) => row.statusToken !== KEEP_APPLICATION_STATUS_TOKEN),
  );
  const deletedApplications = new Set(applicationIds);
  const keptApplicationInviteIds = new Set(
    snapshot.applications
      .filter((row) => row.statusToken === KEEP_APPLICATION_STATUS_TOKEN)
      .map((row) => row.inviteCodeId),
  );

  const inviteCodeIds = rowIds(
    snapshot.inviteCodes.filter((row) => row.code !== DEMO_INVITE_CODE && !keptApplicationInviteIds.has(row.id)),
  );
  const demoInvite = snapshot.inviteCodes.find((row) => row.code === DEMO_INVITE_CODE);
  const inviteDemoReset = Boolean(
    demoInvite && (demoInvite.uses !== 0 || demoInvite.maxUses !== DEMO_INVITE_MAX_USES),
  );

  const userIds = rowIds(snapshot.users.filter((row) => !SEED_USERS.has(row.id)));
  const projectIds = rowIds(snapshot.trackProjects.filter((row) => !SEED_PROJECTS.has(row.id)));
  const dealIds = rowIds(
    snapshot.deals.filter((row) => !SEED_DEALS.has(row.id) || !SEED_USERS.has(row.sponsorId)),
  );
  const deletedDeals = new Set(dealIds);
  const postIds = rowIds(
    snapshot.posts.filter(
      (row) => row.isTest || !SEED_USERS.has(row.authorId) || (row.dealId != null && deletedDeals.has(row.dealId)),
    ),
  );
  const deletedPosts = new Set(postIds);
  const conversationIds = rowIds(
    snapshot.conversations.filter((row) => !SEED_USERS.has(row.userAId) || !SEED_USERS.has(row.userBId)),
  );
  const deletedConversations = new Set(conversationIds);
  const caseIds = rowIds(snapshot.verificationCases.filter((row) => !keptCase(row)));
  const deletedCases = new Set(caseIds);

  const likes = snapshot.likes.filter((row) => deletedPosts.has(row.postId) || !SEED_USERS.has(row.userId));

  const ids: Record<IdTable, string[]> = {
    verification_evidence: rowIds(snapshot.verificationEvidence),
    verification_run: rowIds(snapshot.verificationRuns),
    crm_note: rowIds(snapshot.crmNotes),
    crm_event: rowIds(snapshot.crmEvents),
    crm_person: rowIds(snapshot.crmPeople),
    outbox_notice: rowIds(snapshot.outboxNotices),
    help_turn: rowIds(snapshot.helpTurns),
    email_challenge: rowIds(snapshot.emailChallenges),
    moderation_event: rowIds(snapshot.moderationEvents),
    comment: rowIds(
      snapshot.comments.filter((row) => deletedPosts.has(row.postId) || !SEED_USERS.has(row.authorId)),
    ),
    post: postIds,
    deal_message: rowIds(
      snapshot.dealMessages.filter((row) => deletedDeals.has(row.dealId) || !SEED_USERS.has(row.authorId)),
    ),
    deal_document: rowIds(
      snapshot.dealDocuments.filter((row) => deletedDeals.has(row.dealId) || !SEED_USERS.has(row.authorId)),
    ),
    deal_event: rowIds(
      snapshot.dealEvents.filter(
        (row) => deletedDeals.has(row.dealId) || (row.actorId != null && !SEED_USERS.has(row.actorId)),
      ),
    ),
    deal_access: rowIds(
      snapshot.dealAccess.filter((row) => deletedDeals.has(row.dealId) || !SEED_USERS.has(row.requesterId)),
    ),
    deal: dealIds,
    message: rowIds(snapshot.messages.filter((row) => deletedConversations.has(row.conversationId))),
    conversation: conversationIds,
    connection: rowIds(
      snapshot.connections.filter((row) => !SEED_USERS.has(row.fromId) || !SEED_USERS.has(row.toId)),
    ),
    introduction: rowIds(
      snapshot.introductions.filter(
        (row) => row.isTest || !SEED_USERS.has(row.fromId) || !SEED_USERS.has(row.toId),
      ),
    ),
    report: rowIds(
      snapshot.reports.filter((row) => !SEED_USERS.has(row.reporterId) || !SEED_USERS.has(row.targetUserId)),
    ),
    block: rowIds(
      snapshot.blocks.filter((row) => !SEED_USERS.has(row.blockerId) || !SEED_USERS.has(row.blockedId)),
    ),
    notification: rowIds(snapshot.notifications.filter((row) => !SEED_USERS.has(row.userId))),
    saved_filter: rowIds(snapshot.savedFilters.filter((row) => !SEED_USERS.has(row.userId))),
    payment_event: rowIds(
      snapshot.paymentEvents.filter((row) => row.userId == null || !SEED_USERS.has(row.userId)),
    ),
    legal_acceptance: rowIds(
      snapshot.legalAcceptances.filter((row) => {
        if (row.applicationId && deletedApplications.has(row.applicationId)) return true;
        if (row.userId && !SEED_USERS.has(row.userId)) return true;
        return row.applicationId == null && row.userId == null;
      }),
    ),
    business_card: rowIds(
      snapshot.businessCards.filter((row) => {
        if (row.applicationId && deletedApplications.has(row.applicationId)) return true;
        if (row.userId && !SEED_USERS.has(row.userId)) return true;
        return row.applicationId == null && row.userId == null;
      }),
    ),
    application_decision: rowIds(
      snapshot.applicationDecisions.filter((row) => deletedApplications.has(row.applicationId)),
    ),
    application: applicationIds,
    invite_request: rowIds(
      snapshot.inviteRequests.filter((row) => row.statusToken !== KEEP_INVITE_REQUEST_STATUS_TOKEN),
    ),
    invite_code: inviteCodeIds,
    verification_check: rowIds(snapshot.verificationChecks.filter((row) => deletedCases.has(row.caseId))),
    verification_event: rowIds(snapshot.verificationEvents.filter((row) => deletedCases.has(row.caseId))),
    verification_case: caseIds,
    confirmation: rowIds(
      snapshot.confirmations.filter(
        (row) => !SEED_PROJECTS.has(row.projectId) || !SEED_CONFIRMATIONS.has(row.token),
      ),
    ),
    track_project: projectIds,
    user: userIds,
  };

  const counts: Record<string, number> = { invite_demo_reset: inviteDemoReset ? 1 : 0 };
  for (const table of CLEAN_TABLES) {
    counts[table] = table === "like" ? likes.length : ids[table].length;
  }
  return { counts, ids, likes, inviteDemoReset };
}

/** One log line of table names and counts. Keys that are not plain table names are rejected so row text cannot leak. */
export function formatCleanCounts(mode: "dry" | "delete", counts: Record<string, number>): string {
  const parts: string[] = [];
  for (const key of Object.keys(counts).sort()) {
    if (!/^[a-z0-9_]+$/.test(key)) throw new Error("Cleanup log key was rejected");
    const value = counts[key];
    if (!Number.isInteger(value) || value < 0) throw new Error("Cleanup log count was rejected");
    parts.push(`${key}=${value}`);
  }
  return `CLEAN_TEST_DATA mode=${mode} ${parts.join(" ")}`;
}

type Tx = Prisma.TransactionClient;

async function deleteById(tx: Tx, table: IdTable, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const where = { id: { in: ids } };
  switch (table) {
    case "verification_evidence":
      await tx.verificationEvidence.deleteMany({ where });
      return;
    case "verification_run":
      await tx.verificationRun.deleteMany({ where });
      return;
    case "crm_note":
      await tx.crmNote.deleteMany({ where });
      return;
    case "crm_event":
      await tx.crmEvent.deleteMany({ where });
      return;
    case "crm_person":
      await tx.crmPerson.deleteMany({ where });
      return;
    case "outbox_notice":
      await tx.outboxNotice.deleteMany({ where });
      return;
    case "help_turn":
      await tx.helpTurn.deleteMany({ where });
      return;
    case "email_challenge":
      await tx.emailChallenge.deleteMany({ where });
      return;
    case "moderation_event":
      await tx.moderationEvent.deleteMany({ where });
      return;
    case "comment":
      await tx.comment.deleteMany({ where });
      return;
    case "post":
      await tx.post.deleteMany({ where });
      return;
    case "deal_message":
      await tx.dealMessage.deleteMany({ where: { id: { in: ids }, parentId: { not: null } } });
      await tx.dealMessage.deleteMany({ where });
      return;
    case "deal_document":
      await tx.dealDocument.deleteMany({ where });
      return;
    case "deal_event":
      await tx.dealEvent.deleteMany({ where });
      return;
    case "deal_access":
      await tx.dealAccess.deleteMany({ where });
      return;
    case "deal":
      await tx.deal.deleteMany({ where });
      return;
    case "message":
      await tx.message.deleteMany({ where });
      return;
    case "conversation":
      await tx.conversation.deleteMany({ where });
      return;
    case "connection":
      await tx.connection.deleteMany({ where });
      return;
    case "introduction":
      await tx.introduction.deleteMany({ where });
      return;
    case "report":
      await tx.report.deleteMany({ where });
      return;
    case "block":
      await tx.block.deleteMany({ where });
      return;
    case "notification":
      await tx.notification.deleteMany({ where });
      return;
    case "saved_filter":
      await tx.savedFilter.deleteMany({ where });
      return;
    case "payment_event":
      await tx.paymentEvent.deleteMany({ where });
      return;
    case "legal_acceptance":
      await tx.legalAcceptance.deleteMany({ where });
      return;
    case "business_card":
      await tx.businessCard.deleteMany({ where });
      return;
    case "application_decision":
      await tx.applicationDecision.deleteMany({ where });
      return;
    case "application":
      await tx.application.deleteMany({ where });
      return;
    case "invite_request":
      await tx.inviteRequest.deleteMany({ where });
      return;
    case "invite_code":
      await tx.inviteRequest.updateMany({ where: { inviteCodeId: { in: ids } }, data: { inviteCodeId: null } });
      await tx.inviteCode.deleteMany({ where });
      return;
    case "verification_check":
      await tx.verificationCheck.deleteMany({ where });
      return;
    case "verification_event":
      await tx.verificationEvent.deleteMany({ where });
      return;
    case "verification_case":
      await tx.verificationCase.deleteMany({ where });
      return;
    case "confirmation":
      await tx.confirmation.deleteMany({ where });
      return;
    case "track_project":
      await tx.trackProject.deleteMany({ where });
      return;
    case "user":
      await tx.user.deleteMany({ where });
      return;
    default: {
      const neverTable: never = table;
      throw new Error(`Cleanup table was not handled: ${neverTable}`);
    }
  }
}

async function detachUsers(tx: Tx, userIds: string[]): Promise<void> {
  if (!userIds.length) return;
  await tx.application.updateMany({ where: { reviewerId: { in: userIds } }, data: { reviewerId: null } });
  await tx.application.updateMany({ where: { userId: { in: userIds } }, data: { userId: null } });
  await tx.inviteCode.updateMany({ where: { createdById: { in: userIds } }, data: { createdById: null } });
  await tx.verificationCheck.updateMany({ where: { reviewerId: { in: userIds } }, data: { reviewerId: null } });
  await tx.verificationEvent.updateMany({ where: { actorId: { in: userIds } }, data: { actorId: null } });
  await tx.applicationDecision.updateMany({ where: { actorId: { in: userIds } }, data: { actorId: null } });
  await tx.dealEvent.updateMany({ where: { actorId: { in: userIds } }, data: { actorId: null } });
  await tx.moderationEvent.updateMany({ where: { actorId: { in: userIds } }, data: { actorId: null } });
  await tx.businessCard.updateMany({ where: { userId: { in: userIds } }, data: { userId: null } });
}

export async function loadCleanSnapshot(db: PrismaClient = prisma): Promise<CleanSnapshot> {
  const [
    users,
    applications,
    applicationDecisions,
    inviteRequests,
    inviteCodes,
    verificationRuns,
    verificationEvidence,
    verificationCases,
    verificationChecks,
    verificationEvents,
    trackProjects,
    confirmations,
    deals,
    posts,
    likes,
    comments,
    dealAccess,
    dealDocuments,
    dealMessages,
    dealEvents,
    conversations,
    messages,
    connections,
    introductions,
    notifications,
    savedFilters,
    paymentEvents,
    businessCards,
    legalAcceptances,
    emailChallenges,
    crmPeople,
    crmNotes,
    crmEvents,
    outboxNotices,
    helpTurns,
    reports,
    blocks,
    moderationEvents,
  ] = await Promise.all([
    db.user.findMany({ select: { id: true } }),
    db.application.findMany({ select: { id: true, statusToken: true, inviteCodeId: true } }),
    db.applicationDecision.findMany({ select: { id: true, applicationId: true } }),
    db.inviteRequest.findMany({ select: { id: true, statusToken: true } }),
    db.inviteCode.findMany({ select: { id: true, code: true, uses: true, maxUses: true } }),
    db.verificationRun.findMany({ select: { id: true } }),
    db.verificationEvidence.findMany({ select: { id: true } }),
    db.verificationCase.findMany({ select: { id: true, userId: true, projectId: true } }),
    db.verificationCheck.findMany({ select: { id: true, caseId: true } }),
    db.verificationEvent.findMany({ select: { id: true, caseId: true } }),
    db.trackProject.findMany({ select: { id: true } }),
    db.confirmation.findMany({ select: { id: true, projectId: true, token: true } }),
    db.deal.findMany({ select: { id: true, sponsorId: true } }),
    db.post.findMany({ select: { id: true, authorId: true, dealId: true, isTest: true } }),
    db.like.findMany({ select: { userId: true, postId: true } }),
    db.comment.findMany({ select: { id: true, authorId: true, postId: true } }),
    db.dealAccess.findMany({ select: { id: true, dealId: true, requesterId: true } }),
    db.dealDocument.findMany({ select: { id: true, dealId: true, authorId: true } }),
    db.dealMessage.findMany({ select: { id: true, dealId: true, authorId: true } }),
    db.dealEvent.findMany({ select: { id: true, dealId: true, actorId: true } }),
    db.conversation.findMany({ select: { id: true, userAId: true, userBId: true } }),
    db.message.findMany({ select: { id: true, conversationId: true } }),
    db.connection.findMany({ select: { id: true, fromId: true, toId: true } }),
    db.introduction.findMany({ select: { id: true, fromId: true, toId: true, isTest: true } }),
    db.notification.findMany({ select: { id: true, userId: true } }),
    db.savedFilter.findMany({ select: { id: true, userId: true } }),
    db.paymentEvent.findMany({ select: { id: true, userId: true } }),
    db.businessCard.findMany({ select: { id: true, userId: true, applicationId: true } }),
    db.legalAcceptance.findMany({ select: { id: true, userId: true, applicationId: true } }),
    db.emailChallenge.findMany({ select: { id: true } }),
    db.crmPerson.findMany({ select: { id: true } }),
    db.crmNote.findMany({ select: { id: true } }),
    db.crmEvent.findMany({ select: { id: true } }),
    db.outboxNotice.findMany({ select: { id: true } }),
    db.helpTurn.findMany({ select: { id: true } }),
    db.report.findMany({ select: { id: true, reporterId: true, targetUserId: true } }),
    db.block.findMany({ select: { id: true, blockerId: true, blockedId: true } }),
    db.moderationEvent.findMany({ select: { id: true } }),
  ]);
  return {
    users,
    applications,
    applicationDecisions,
    inviteRequests,
    inviteCodes,
    verificationRuns,
    verificationEvidence,
    verificationCases,
    verificationChecks,
    verificationEvents,
    trackProjects,
    confirmations,
    deals,
    posts,
    likes,
    comments,
    dealAccess,
    dealDocuments,
    dealMessages,
    dealEvents,
    conversations,
    messages,
    connections,
    introductions,
    notifications,
    savedFilters,
    paymentEvents,
    businessCards,
    legalAcceptances,
    emailChallenges,
    crmPeople,
    crmNotes,
    crmEvents,
    outboxNotices,
    helpTurns,
    reports,
    blocks,
    moderationEvents,
  };
}

export async function applyCleanPlan(plan: CleanPlan, db: PrismaClient = prisma): Promise<void> {
  await db.$transaction(
    async (tx) => {
      await detachUsers(tx, plan.ids.user);
      for (const table of CLEAN_TABLES) {
        if (table === "like") {
          if (!plan.likes.length) continue;
          await tx.like.deleteMany({
            where: { OR: plan.likes.map((like) => ({ userId: like.userId, postId: like.postId })) },
          });
          continue;
        }
        await deleteById(tx, table, plan.ids[table]);
      }
      if (plan.inviteDemoReset) {
        await tx.inviteCode.updateMany({
          where: { code: DEMO_INVITE_CODE },
          data: { uses: 0, maxUses: DEMO_INVITE_MAX_USES },
        });
      }
    },
    { maxWait: 10_000, timeout: 120_000 },
  );
}

export async function cleanTestDataFromEnv(options?: {
  raw?: string;
  load?: () => Promise<CleanSnapshot>;
  apply?: (plan: CleanPlan) => Promise<void>;
  log?: (line: string) => void;
  warn?: (line: string) => void;
}): Promise<"off" | "invalid" | "dry" | "delete"> {
  const mode = cleanTestDataMode(options && "raw" in options ? options.raw : process.env.CLEAN_TEST_DATA);
  if (mode === "off") return "off";
  if (mode === "invalid") {
    (options?.warn ?? console.warn)(CLEAN_TEST_DATA_IGNORED);
    return "invalid";
  }
  const snapshot = await (options?.load ?? (() => loadCleanSnapshot()))();
  const plan = planCleanTestData(snapshot);
  (options?.log ?? console.log)(formatCleanCounts(mode, plan.counts));
  if (mode === "delete") await (options?.apply ?? ((next: CleanPlan) => applyCleanPlan(next)))(plan);
  return mode;
}
