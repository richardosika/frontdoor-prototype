import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLEAN_TABLES,
  CLEAN_TEST_DATA_IGNORED,
  DEMO_INVITE_CODE,
  DEMO_INVITE_MAX_USES,
  KEEP_APPLICATION_STATUS_TOKEN,
  KEEP_INVITE_REQUEST_STATUS_TOKEN,
  SEED_CONFIRMATION_TOKENS,
  SEED_DEAL_IDS,
  SEED_PROJECT_IDS,
  SEED_USER_IDS,
  cleanTestDataFromEnv,
  cleanTestDataMode,
  formatCleanCounts,
  planCleanTestData,
  type CleanPlan,
  type CleanSnapshot,
} from "@/lib/clean-test-data";

function emptySnapshot(): CleanSnapshot {
  return {
    users: [],
    applications: [],
    applicationDecisions: [],
    inviteRequests: [],
    inviteCodes: [],
    verificationRuns: [],
    verificationEvidence: [],
    verificationCases: [],
    verificationChecks: [],
    verificationEvents: [],
    trackProjects: [],
    confirmations: [],
    deals: [],
    posts: [],
    likes: [],
    comments: [],
    dealAccess: [],
    dealDocuments: [],
    dealMessages: [],
    dealEvents: [],
    conversations: [],
    messages: [],
    connections: [],
    introductions: [],
    notifications: [],
    savedFilters: [],
    paymentEvents: [],
    businessCards: [],
    legalAcceptances: [],
    emailChallenges: [],
    crmPeople: [],
    crmNotes: [],
    crmEvents: [],
    outboxNotices: [],
    helpTurns: [],
    reports: [],
    blocks: [],
    moderationEvents: [],
  };
}

function testingSnapshot(): CleanSnapshot {
  const snapshot = emptySnapshot();
  snapshot.users.push({ id: "user_mh" }, { id: "user_pa" }, { id: "user_test" }, { id: "user_extra_admin" });
  snapshot.applications.push(
    { id: "app_jordan", statusToken: KEEP_APPLICATION_STATUS_TOKEN, inviteCodeId: "invite_founding" },
    { id: "app_tester", statusToken: "tester-token", inviteCodeId: "invite_other" },
  );
  snapshot.applicationDecisions.push(
    { id: "decision_tester", applicationId: "app_tester" },
    { id: "decision_jordan", applicationId: "app_jordan" },
  );
  snapshot.inviteRequests.push(
    { id: "request_chris", statusToken: KEEP_INVITE_REQUEST_STATUS_TOKEN },
    { id: "request_tester", statusToken: "tester-request" },
  );
  snapshot.inviteCodes.push(
    { id: "invite_founding", code: DEMO_INVITE_CODE, uses: 13, maxUses: 40 },
    { id: "invite_hale", code: "PF-HALE-3LEFT", uses: 0, maxUses: 3 },
    { id: "invite_other", code: "PF-NZJP-9BDW", uses: 2, maxUses: 5 },
  );
  snapshot.verificationRuns.push({ id: "run_jordan" }, { id: "run_company" });
  snapshot.verificationEvidence.push({ id: "evidence_1" });
  snapshot.verificationCases.push(
    { id: "case_marcus", userId: "user_mh", projectId: null },
    { id: "case_ironbound", userId: null, projectId: "proj_ironbound" },
    { id: "case_tester", userId: "user_test", projectId: null },
  );
  snapshot.verificationChecks.push(
    { id: "check_marcus", caseId: "case_marcus" },
    { id: "check_tester", caseId: "case_tester" },
  );
  snapshot.verificationEvents.push(
    { id: "event_marcus", caseId: "case_marcus" },
    { id: "event_tester", caseId: "case_tester" },
  );
  snapshot.trackProjects.push({ id: "proj_ironbound" }, { id: "proj_made_by_marcus" }, { id: "proj_tester" });
  snapshot.confirmations.push(
    { id: "confirm_seed", projectId: "proj_ironbound", token: "demo-ironbound-confirmed" },
    { id: "confirm_extra", projectId: "proj_ironbound", token: "tester-vouch" },
    { id: "confirm_tester", projectId: "proj_tester", token: "tester-project-vouch" },
  );
  snapshot.deals.push(
    { id: "deal_newark", sponsorId: "user_mh" },
    { id: "deal_tester", sponsorId: "user_test" },
  );
  snapshot.posts.push(
    { id: "post_seed", authorId: "user_mh", dealId: "deal_newark", isTest: false },
    { id: "post_note", authorId: "user_pa", dealId: null, isTest: false },
    { id: "post_test_flag", authorId: "user_mh", dealId: null, isTest: true },
    { id: "post_tester", authorId: "user_test", dealId: null, isTest: false },
    { id: "post_on_tester_deal", authorId: "user_mh", dealId: "deal_tester", isTest: false },
  );
  snapshot.likes.push(
    { userId: "user_mh", postId: "post_seed" },
    { userId: "user_test", postId: "post_seed" },
    { userId: "user_mh", postId: "post_tester" },
  );
  snapshot.comments.push(
    { id: "comment_seed", authorId: "user_pa", postId: "post_seed" },
    { id: "comment_tester", authorId: "user_test", postId: "post_seed" },
  );
  snapshot.dealAccess.push(
    { id: "access_seed", dealId: "deal_newark", requesterId: "user_pa" },
    { id: "access_tester", dealId: "deal_newark", requesterId: "user_test" },
  );
  snapshot.dealDocuments.push({ id: "doc_seed", dealId: "deal_newark", authorId: "user_mh" });
  snapshot.dealMessages.push(
    { id: "room_seed", dealId: "deal_newark", authorId: "user_pa" },
    { id: "room_tester", dealId: "deal_newark", authorId: "user_test" },
  );
  snapshot.dealEvents.push(
    { id: "deal_event_seed", dealId: "deal_newark", actorId: "user_mh" },
    { id: "deal_event_tester", dealId: "deal_newark", actorId: "user_test" },
  );
  snapshot.conversations.push(
    { id: "conv_seed", userAId: "user_mh", userBId: "user_pa" },
    { id: "conv_tester", userAId: "user_mh", userBId: "user_test" },
  );
  snapshot.messages.push(
    { id: "message_seed", conversationId: "conv_seed" },
    { id: "message_tester", conversationId: "conv_tester" },
  );
  snapshot.connections.push(
    { id: "conn_seed", fromId: "user_mh", toId: "user_pa" },
    { id: "conn_tester", fromId: "user_test", toId: "user_mh" },
  );
  snapshot.introductions.push(
    { id: "intro_seed", fromId: "user_mh", toId: "user_pa", isTest: false },
    { id: "intro_flag", fromId: "user_mh", toId: "user_pa", isTest: true },
  );
  snapshot.notifications.push(
    { id: "note_seed", userId: "user_mh" },
    { id: "note_tester", userId: "user_test" },
  );
  snapshot.savedFilters.push({ id: "filter_seed", userId: "user_mh" }, { id: "filter_tester", userId: "user_test" });
  snapshot.paymentEvents.push(
    { id: "pay_seed", userId: "user_mh" },
    { id: "pay_tester", userId: "user_test" },
    { id: "pay_orphan", userId: null },
  );
  snapshot.businessCards.push(
    { id: "card_jordan", userId: null, applicationId: "app_jordan" },
    { id: "card_tester", userId: "user_test", applicationId: "app_tester" },
    { id: "card_member", userId: "user_mh", applicationId: null },
  );
  snapshot.legalAcceptances.push(
    { id: "legal_jordan", userId: null, applicationId: "app_jordan" },
    { id: "legal_tester", userId: null, applicationId: "app_tester" },
    { id: "legal_member", userId: "user_mh", applicationId: null },
  );
  snapshot.emailChallenges.push({ id: "challenge_1" });
  snapshot.crmPeople.push({ id: "crm_1" }, { id: "crm_2" });
  snapshot.crmNotes.push({ id: "crm_note_1" });
  snapshot.crmEvents.push({ id: "crm_event_1" });
  snapshot.outboxNotices.push({ id: "outbox_1" });
  snapshot.helpTurns.push({ id: "help_1" }, { id: "help_2" });
  snapshot.reports.push(
    { id: "report_seed", reporterId: "user_pa", targetUserId: "user_mh" },
    { id: "report_tester", reporterId: "user_test", targetUserId: "user_mh" },
  );
  snapshot.blocks.push({ id: "block_tester", blockerId: "user_test", blockedId: "user_mh" });
  snapshot.moderationEvents.push({ id: "audit_1" });
  return snapshot;
}

function withoutDeleted(snapshot: CleanSnapshot, plan: CleanPlan): CleanSnapshot {
  const next = structuredClone(snapshot);
  const gone = new Set(Object.values(plan.ids).flat());
  const likeGone = new Set(plan.likes.map((like) => `${like.userId}:${like.postId}`));
  const lists = next as unknown as Record<string, { id?: string; userId?: string; postId?: string }[]>;
  for (const key of Object.keys(lists)) {
    if (key === "likes") {
      next.likes = next.likes.filter((like) => !likeGone.has(`${like.userId}:${like.postId}`));
      continue;
    }
    if (key === "inviteCodes") {
      next.inviteCodes = next.inviteCodes
        .filter((row) => !gone.has(row.id))
        .map((row) =>
          row.code === DEMO_INVITE_CODE ? { ...row, uses: 0, maxUses: DEMO_INVITE_MAX_USES } : row,
        );
      continue;
    }
    lists[key] = lists[key].filter((row) => !row.id || !gone.has(row.id));
  }
  return next;
}

describe("CLEAN_TEST_DATA", () => {
  it("accepts only an empty value, dry, and 1", () => {
    expect(cleanTestDataMode(undefined)).toBe("off");
    expect(cleanTestDataMode("")).toBe("off");
    expect(cleanTestDataMode("dry")).toBe("dry");
    expect(cleanTestDataMode("1")).toBe("delete");
    for (const value of ["true", "yes", "delete", " 1", "1 ", "DRY"]) {
      expect(cleanTestDataMode(value)).toBe("invalid");
    }
  });

  it("keeps the seeded demo and counts every testing row", () => {
    const plan = planCleanTestData(testingSnapshot());
    expect(plan.ids.user).toEqual(["user_test", "user_extra_admin"]);
    expect(plan.ids.application).toEqual(["app_tester"]);
    expect(plan.ids.application_decision).toEqual(["decision_tester"]);
    expect(plan.ids.invite_request).toEqual(["request_tester"]);
    expect(plan.ids.invite_code).toEqual(["invite_hale", "invite_other"]);
    expect(plan.inviteDemoReset).toBe(true);
    expect(plan.ids.verification_run).toEqual(["run_jordan", "run_company"]);
    expect(plan.ids.verification_evidence).toEqual(["evidence_1"]);
    expect(plan.ids.verification_case).toEqual(["case_tester"]);
    expect(plan.ids.verification_check).toEqual(["check_tester"]);
    expect(plan.ids.verification_event).toEqual(["event_tester"]);
    expect(plan.ids.track_project).toEqual(["proj_made_by_marcus", "proj_tester"]);
    expect(plan.ids.confirmation).toEqual(["confirm_extra", "confirm_tester"]);
    expect(plan.ids.deal).toEqual(["deal_tester"]);
    expect(plan.ids.post).toEqual(["post_test_flag", "post_tester", "post_on_tester_deal"]);
    expect(plan.likes).toEqual([
      { userId: "user_test", postId: "post_seed" },
      { userId: "user_mh", postId: "post_tester" },
    ]);
    expect(plan.ids.comment).toEqual(["comment_tester"]);
    expect(plan.ids.deal_access).toEqual(["access_tester"]);
    expect(plan.ids.deal_document).toEqual([]);
    expect(plan.ids.deal_message).toEqual(["room_tester"]);
    expect(plan.ids.deal_event).toEqual(["deal_event_tester"]);
    expect(plan.ids.conversation).toEqual(["conv_tester"]);
    expect(plan.ids.message).toEqual(["message_tester"]);
    expect(plan.ids.connection).toEqual(["conn_tester"]);
    expect(plan.ids.introduction).toEqual(["intro_flag"]);
    expect(plan.ids.notification).toEqual(["note_tester"]);
    expect(plan.ids.saved_filter).toEqual(["filter_tester"]);
    expect(plan.ids.payment_event).toEqual(["pay_tester", "pay_orphan"]);
    expect(plan.ids.business_card).toEqual(["card_tester"]);
    expect(plan.ids.legal_acceptance).toEqual(["legal_tester"]);
    expect(plan.ids.email_challenge).toEqual(["challenge_1"]);
    expect(plan.ids.crm_person).toEqual(["crm_1", "crm_2"]);
    expect(plan.ids.crm_note).toEqual(["crm_note_1"]);
    expect(plan.ids.crm_event).toEqual(["crm_event_1"]);
    expect(plan.ids.outbox_notice).toEqual(["outbox_1"]);
    expect(plan.ids.help_turn).toEqual(["help_1", "help_2"]);
    expect(plan.ids.report).toEqual(["report_tester"]);
    expect(plan.ids.block).toEqual(["block_tester"]);
    expect(plan.ids.moderation_event).toEqual(["audit_1"]);
    expect(plan.counts.application).toBe(1);
    expect(plan.counts.help_turn).toBe(2);
    expect(plan.counts.invite_demo_reset).toBe(1);
    expect(plan.counts.user).toBe(2);
    for (const id of [...plan.ids.user, ...plan.ids.track_project, ...plan.ids.deal, ...plan.ids.application]) {
      expect(SEED_USER_IDS).not.toContain(id);
      expect(SEED_PROJECT_IDS).not.toContain(id);
      expect(SEED_DEAL_IDS).not.toContain(id);
      expect(id).not.toBe("app_jordan");
    }
  });

  it("leaves a code in place when the seeded application still points at it", () => {
    const snapshot = testingSnapshot();
    snapshot.applications[0].inviteCodeId = "invite_hale";
    const plan = planCleanTestData(snapshot);
    expect(plan.ids.invite_code).toEqual(["invite_other"]);
    expect(plan.ids.invite_code).not.toContain("invite_founding");
  });

  it("does not reset the demo invite when it is already 0 of 40", () => {
    const snapshot = testingSnapshot();
    snapshot.inviteCodes[0] = { id: "invite_founding", code: DEMO_INVITE_CODE, uses: 0, maxUses: 40 };
    expect(planCleanTestData(snapshot).inviteDemoReset).toBe(false);
    snapshot.inviteCodes[0].maxUses = 99;
    expect(planCleanTestData(snapshot).inviteDemoReset).toBe(true);
  });

  it("is idempotent once the planned rows are gone", () => {
    const snapshot = testingSnapshot();
    const first = planCleanTestData(snapshot);
    const second = planCleanTestData(withoutDeleted(snapshot, first));
    expect(second.inviteDemoReset).toBe(false);
    for (const table of CLEAN_TABLES) expect(second.counts[table]).toBe(0);
    expect(second.counts.invite_demo_reset).toBe(0);
    expect(second.likes).toEqual([]);
  });

  it("logs counts only", () => {
    const plan = planCleanTestData(testingSnapshot());
    const line = formatCleanCounts("dry", plan.counts);
    expect(line.startsWith("CLEAN_TEST_DATA mode=dry ")).toBe(true);
    expect(line).toContain("application=1");
    expect(line).toContain("help_turn=2");
    expect(line).toContain("invite_demo_reset=1");
    expect(line).not.toMatch(/@|jordan|PF-|password|tester-token|Marcus|hale/i);
    expect(() => formatCleanCounts("dry", { "bad key": 1 })).toThrow(/rejected/);
    expect(() => formatCleanCounts("delete", { application: 1.5 })).toThrow(/rejected/);
  });

  it("dry-run does not apply, and delete applies the plan once", async () => {
    const applied: CleanPlan[] = [];
    const lines: string[] = [];
    const snapshot = testingSnapshot();
    const dry = await cleanTestDataFromEnv({
      raw: "dry",
      load: async () => snapshot,
      apply: async (plan) => {
        applied.push(plan);
      },
      log: (line) => lines.push(line),
    });
    expect(dry).toBe("dry");
    expect(applied).toEqual([]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("mode=dry");
    expect(lines[0]).not.toContain("user_test");

    const deleted = await cleanTestDataFromEnv({
      raw: "1",
      load: async () => snapshot,
      apply: async (plan) => {
        applied.push(plan);
      },
      log: (line) => lines.push(line),
    });
    expect(deleted).toBe("delete");
    expect(applied).toHaveLength(1);
    expect(applied[0].ids.user).not.toContain("user_mh");
    expect(applied[0].ids.application).not.toContain("app_jordan");
    expect(lines[1]).toContain("mode=delete");
    expect(JSON.stringify(applied[0])).not.toMatch(/password|@/);
  });

  it("does nothing when the flag is unset or unrecognized", async () => {
    let loaded = 0;
    const warnings: string[] = [];
    const secret = "not-the-real-flag";
    expect(
      await cleanTestDataFromEnv({
        raw: undefined,
        load: async () => {
          loaded += 1;
          return emptySnapshot();
        },
      }),
    ).toBe("off");
    expect(
      await cleanTestDataFromEnv({
        raw: "",
        load: async () => {
          loaded += 1;
          return emptySnapshot();
        },
      }),
    ).toBe("off");
    expect(
      await cleanTestDataFromEnv({
        raw: secret,
        load: async () => {
          loaded += 1;
          return emptySnapshot();
        },
        warn: (line) => warnings.push(line),
      }),
    ).toBe("invalid");
    expect(loaded).toBe(0);
    expect(warnings).toEqual([CLEAN_TEST_DATA_IGNORED]);
    expect(CLEAN_TEST_DATA_IGNORED).not.toContain(secret);
  });

  it("matches the ids and tokens the seed ships", () => {
    const source = readFileSync(resolve(__dirname, "../prisma/seed.ts"), "utf8");
    const deals = [...source.matchAll(/id: "(deal_[a-z0-9_]+)"/g)].map((match) => match[1]);
    const tokens = [...source.matchAll(/token: "(demo-[a-z0-9-]+)"/g)].map((match) => match[1]);
    expect(new Set(deals)).toEqual(new Set(SEED_DEAL_IDS));
    expect(new Set(tokens)).toEqual(new Set(SEED_CONFIRMATION_TOKENS));
    expect(source).toContain(`code: "${DEMO_INVITE_CODE}"`);
    expect(source).toContain(`statusToken: "${KEEP_APPLICATION_STATUS_TOKEN}"`);
    expect(source).toContain(`statusToken: "${KEEP_INVITE_REQUEST_STATUS_TOKEN}"`);
    expect(SEED_USER_IDS).toContain("user_mh");
    expect(SEED_PROJECT_IDS).toContain("proj_ironbound");
    const implementation = readFileSync(resolve(__dirname, "../src/lib/clean-test-data.ts"), "utf8");
    expect(implementation).not.toContain("passwordHash");
    expect(implementation).not.toContain("ADMIN_PASSWORD");
  });
});
