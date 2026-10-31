import {
  DealKind,
  MemberRole,
  PrismaClient,
  VerificationTier,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { BRAND } from "../src/lib/brand";
import { duplicateExampleIds } from "../src/lib/demo-cleanup";
import { ORPHAN_VERIFICATION_CASE_IDS, verificationCaseIsDeletableOrphan } from "../src/lib/orphan-case";
import { deleteMemberAccount } from "../src/lib/remove-member";
import { alertNewMemberMatches } from "../src/lib/member-alerts";
import { SEEDED_EXTRA_PROJECTS, SEEDED_MEMBER_FILES, SEEDED_PROJECT_FILES } from "../src/lib/seed-coherence";
import { MEMBER_CHECKS, PROJECT_CHECKS, type VerificationStatus } from "../src/lib/verification";

const prisma = new PrismaClient();
const passwordHash = bcrypt.hashSync("cornicio-demo", 10);

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);

type Person = {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: MemberRole;
  org: string;
  location: string;
  tier: VerificationTier;
  credentialNote: string;
  bio: string;
  isAdmin?: boolean;
};

const people: Person[] = [
  {
    id: "user_mh",
    email: "marcus.hale@halerow.example",
    name: "Marcus Hale",
    initials: "MH",
    role: "DEVELOPER",
    org: "Hale Row Partners",
    location: "Newark, NJ",
    tier: "CONFIRMED",
    credentialNote: "Hale Row Partners LLC · NJ entity in good standing · deeds and permits matched",
    bio: "Sponsor of small multifamily and mixed-use projects in the NY/NJ market. Fictional.",
  },
  {
    id: "user_pa",
    email: "priya.anand@anandstorage.example",
    name: "Priya Anand",
    initials: "PA",
    role: "DEVELOPER",
    org: "Anand Storage Co.",
    location: "Edison, NJ",
    tier: "CONFIRMED",
    credentialNote: "Anand Storage Co. · NJ entity in good standing",
    bio: "Self-storage developer. Fictional.",
  },
  {
    id: "user_rk",
    email: "rachel.kim@kimfamily.example",
    name: "Rachel Kim",
    initials: "RK",
    role: "FAMILY_OFFICE",
    org: "Kim Family Office",
    location: "New York, NY",
    tier: "INVITED",
    credentialNote: "Accredited-investor attestation · family office entity records on file",
    bio: "Direct investor in Tri-State multifamily. Fictional.",
  },
  {
    id: "user_ev",
    email: "elena.voss@vossreed.example",
    name: "Elena Voss",
    initials: "EV",
    role: "GENERAL_CONTRACTOR",
    org: "Voss & Reed",
    location: "Hoboken, NJ",
    tier: "INVITED",
    credentialNote: "NJ GC registration active · insurance and bonding on file",
    bio: "Ground-up and renovation GC. Fictional.",
  },
  {
    id: "user_ls",
    email: "leo.sandoval@gsbridge.example",
    name: "Leo Sandoval",
    initials: "LS",
    role: "LENDER",
    org: "Garden State Bridge",
    location: "Princeton, NJ",
    tier: "INVITED",
    credentialNote: "Business card matched to public records",
    bio: "Bridge and construction debt. Fictional.",
  },
  {
    id: "user_tn",
    email: "tara.nguyen@nguyencap.example",
    name: "Tara Nguyen",
    initials: "TN",
    role: "INVESTOR_PE",
    org: "Nguyen Capital",
    location: "Jersey City, NJ",
    tier: "INVITED",
    credentialNote: "Accredited-investor attestation · fund entity records on file",
    bio: "Private equity checks from $100K. Fictional.",
  },
  {
    id: "user_dp",
    email: "daniel.park@parkatlantic.example",
    name: "Daniel Park",
    initials: "DP",
    role: "BROKER",
    org: "Park Atlantic",
    location: "Hackensack, NJ",
    tier: "INVITED",
    credentialNote: "Business card matched to public records",
    bio: "Investment sales. Fictional.",
  },
  {
    id: "user_dw",
    email: "dana.whitfield@whitfield.example",
    name: "Dana Whitfield",
    initials: "DW",
    role: "DEVELOPER",
    org: "Whitfield Urban",
    location: "Brooklyn, NY",
    tier: "INVITED",
    credentialNote: "Whitfield Urban LLC · NY entity in good standing",
    bio: "Adaptive reuse in Brooklyn. Fictional.",
  },
  {
    id: "user_hc",
    email: "hannah.cole@colebrandt.example",
    name: "Hannah Cole",
    initials: "HC",
    role: "RE_ATTORNEY",
    org: "Cole Brandt LLP",
    location: "Morristown, NJ",
    tier: "INVITED",
    credentialNote: "Admitted to NJ Bar (2012) and NY Bar (2013) · good standing",
    bio: "Closings and leases. Fictional.",
  },
  {
    id: "user_sr",
    email: "samir.rao@raolaw.example",
    name: "Samir Rao",
    initials: "SR",
    role: "SECURITIES_ATTORNEY",
    org: "Rao Securities Law",
    location: "New York, NY",
    tier: "INVITED",
    credentialNote: "Admitted to NY Bar (2009) · good standing · disciplinary search clear",
    bio: `Fund formation counsel. Fictional. ${BRAND.name} does not run offerings.`,
  },
  {
    id: "user_jw",
    email: "julian.weiss@weissland.example",
    name: "Julian Weiss",
    initials: "JW",
    role: "ZONING_ATTORNEY",
    org: "Weiss Land Use PC",
    location: "Newark, NJ",
    tier: "INVITED",
    credentialNote: "Admitted to NJ Bar (2010) · land-use board appearances reviewed",
    bio: "Variances and land use. Fictional.",
  },
  {
    id: "user_gl",
    email: "grace.liu@liustudio.example",
    name: "Grace Liu",
    initials: "GL",
    role: "ARCHITECT_ENGINEER",
    org: "Liu Studio Architects",
    location: "Jersey City, NJ",
    tier: "INVITED",
    credentialNote: "Business card matched to public records",
    bio: "Multifamily and adaptive reuse. Fictional.",
  },
  {
    id: "user_op",
    email: "owen.pratt@prattsurety.example",
    name: "Owen Pratt",
    initials: "OP",
    role: "INSURANCE",
    org: "Pratt Surety & Risk",
    location: "Parsippany, NJ",
    tier: "INVITED",
    credentialNote: "Business card matched to public records",
    bio: "Builder's risk, title, and surety. Fictional.",
  },
  {
    id: "user_mt",
    email: "mia.torres@torrescapital.example",
    name: "Mia Torres",
    initials: "MT",
    role: "MORTGAGE_BROKER",
    org: "Torres Capital Advisors",
    location: "Hoboken, NJ",
    tier: "INVITED",
    credentialNote: "Business card matched to public records",
    bio: "Places loans for sponsors. Fictional.",
  },
  {
    id: "user_va",
    email: "victor.alvarez@alvarezval.example",
    name: "Victor Alvarez",
    initials: "VA",
    role: "APPRAISER",
    org: "Alvarez Valuation Group",
    location: "Edison, NJ",
    tier: "INVITED",
    credentialNote: "Business card matched to public records",
    bio: "Commercial appraisals. Fictional.",
  },
  {
    id: "user_ns",
    email: "nora.singh@singhproperty.example",
    name: "Nora Singh",
    initials: "NS",
    role: "PROPERTY_MANAGER",
    org: "Singh Property Partners",
    location: "Newark, NJ",
    tier: "INVITED",
    credentialNote: "No business card uploaded",
    bio: "Multifamily operations. Fictional.",
  },
  {
    id: "user_am",
    email: "alicia.moore@moorelind.example",
    name: "Alicia Moore",
    initials: "AM",
    role: "ACCOUNTANT",
    org: "Moore & Lind CPAs",
    location: "New York, NY",
    tier: "INVITED",
    credentialNote: "Prior business card on file",
    bio: "Cost segregation. Fictional.",
  },
  {
    id: "user_bk",
    email: "ben.katz@katzexchange.example",
    name: "Ben Katz",
    initials: "BK",
    role: "EXCHANGE_1031",
    org: "Katz Exchange Services",
    location: "Princeton, NJ",
    tier: "INVITED",
    credentialNote: "Qualified intermediary entity checked · fidelity bond and E&O on file",
    bio: "1031 intermediary. Fictional.",
  },
];

async function deleteOrphanVerificationCases() {
  const rows = await prisma.verificationCase.findMany({
    where: { id: { in: [...ORPHAN_VERIFICATION_CASE_IDS] } },
    select: {
      id: true,
      userId: true,
      projectId: true,
      user: { select: { email: true, name: true, org: true, isAdmin: true } },
      application: { select: { email: true, name: true, org: true } },
      inviteRequest: { select: { email: true, name: true, org: true, note: true } },
      project: { select: { name: true } },
    },
  });
  const found = new Set(rows.map((row) => row.id));
  for (const id of ORPHAN_VERIFICATION_CASE_IDS) {
    if (!found.has(id)) console.log(`Verification case ${id} was not present.`);
  }
  for (const row of rows) {
    const text = [
      row.user?.email,
      row.user?.name,
      row.user?.org,
      row.application?.email,
      row.application?.name,
      row.application?.org,
      row.inviteRequest?.email,
      row.inviteRequest?.name,
      row.inviteRequest?.org,
      row.inviteRequest?.note,
      row.project?.name,
    ]
      .filter(Boolean)
      .join(" ");
    if (
      !verificationCaseIsDeletableOrphan({
        id: row.id,
        userId: row.userId,
        projectId: row.projectId,
        userIsAdmin: row.user?.isAdmin,
        text,
      })
    ) {
      console.log(`Left verification case ${row.id} in place.`);
      continue;
    }
    await prisma.verificationCase.delete({ where: { id: row.id } });
    console.log(`Deleted orphan verification case ${row.id}.`);
  }
}

async function main() {
  const reset = process.env.SEED === "reset";
  const members = await prisma.user.count();
  if (!reset && members > 0) {
    await deleteOrphanVerificationCases();
    await alignSeededDemo();
    console.log("Database already has members. Aligned seeded verification, tiers, and access. Set SEED=reset to wipe and reseed.");
    await syncOwnerPassword();
    return;
  }
  if (reset) {
    await prisma.moderationEvent.deleteMany();
    await prisma.report.deleteMany();
    await prisma.block.deleteMany();
    await prisma.businessCard.deleteMany();
    await prisma.verificationEvent.deleteMany();
    await prisma.verificationCheck.deleteMany();
    await prisma.verificationCase.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.dealEvent.deleteMany();
    await prisma.dealMessage.deleteMany({ where: { parentId: { not: null } } });
    await prisma.dealMessage.deleteMany();
    await prisma.dealDocument.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.connection.deleteMany();
    await prisma.dealAccess.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.like.deleteMany();
    await prisma.post.deleteMany();
    await prisma.deal.deleteMany();
    await prisma.confirmation.deleteMany();
    await prisma.trackProject.deleteMany();
    await prisma.application.deleteMany();
    await prisma.inviteRequest.deleteMany();
    await prisma.inviteCode.deleteMany();
    await prisma.user.deleteMany();
  }

  for (const [index, person] of people.entries()) {
    const slug = person.name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
    await prisma.user.create({
      data: {
        ...person,
        passwordHash,
        isAdmin: Boolean(person.isAdmin),
        status: "ACTIVE",
        phone: `201-555-${String(1000 + index).slice(-4)}`,
        linkedinUrl: `https://www.linkedin.com/in/${slug}-example`,
      },
    });
  }

  await prisma.inviteCode.create({
    data: {
      id: "invite_founding",
      code: "PF-7K2M-91QX",
      maxUses: 40,
      uses: 1,
      note: "Founding demo code",
      createdById: "user_mh",
    },
  });
  await prisma.inviteCode.create({
    data: {
      code: "PF-HALE-3LEFT",
      maxUses: 3,
      uses: 0,
      note: "Marcus Hale personal codes",
      createdById: "user_mh",
    },
  });

  await prisma.application.create({
    data: {
      inviteCodeId: "invite_founding",
      email: "jordan.ellis@ellisarch.example",
      name: "Jordan Ellis",
      passwordHash,
      role: "ARCHITECT_ENGINEER",
      org: "Ellis Atelier",
      location: "Jersey City, NJ",
      credentialValue: "No business card uploaded",
      referenceEmails: [],
      statement: "",
      statusToken: "demo-jordan-ellis-status",
      status: "PENDING",
    },
  });

  await prisma.inviteRequest.create({
    data: {
      name: "Chris Adeyemi",
      email: "chris.adeyemi@adeyemi.example",
      role: "LENDER",
      org: "Adeyemi Credit",
      location: "Jersey City, NJ",
      note: "Bridge lender looking for a code.",
      status: "PENDING",
      statusToken: "demo-chris-invite-status",
    },
  });

  await prisma.trackProject.create({
    data: {
      id: "proj_ironbound",
      userId: "user_mh",
      name: "Ironbound Lofts",
      asset: "Multifamily",
      location: "Newark, NJ",
      year: 2025,
      valueLabel: "$24M",
      summary: "42-unit value-add. Sponsor.",
      confirmations: {
        create: {
          counterpartyName: "Leo Sandoval",
          counterpartyEmail: "leo.sandoval@gsbridge.example",
          token: "demo-ironbound-confirmed",
          status: "CONFIRMED",
          reviewStatus: "APPROVED",
          note: "We provided the construction loan.",
          respondedAt: hoursAgo(24 * 20),
        },
      },
    },
  });
  await prisma.trackProject.create({
    data: {
      id: "proj_halsey",
      userId: "user_mh",
      name: "Halsey Commons",
      asset: "Mixed-use",
      location: "Jersey City, NJ",
      year: 2023,
      valueLabel: "$38M",
      summary: "Retail and creative office. Sponsor.",
      confirmations: {
        create: {
          counterpartyName: "Elena Voss",
          counterpartyEmail: "elena.voss@vossreed.example",
          token: "demo-halsey-confirm",
          status: "PENDING",
        },
      },
    },
  });
  await prisma.trackProject.create({
    data: {
      id: "proj_nora",
      userId: "user_ns",
      name: "Court Street Flats",
      asset: "Multifamily",
      location: "Newark, NJ",
      year: 2024,
      valueLabel: "$11M",
      summary: "Third-party property management.",
      confirmations: {
        create: {
          counterpartyName: "Marcus Hale",
          counterpartyEmail: "marcus.hale@halerow.example",
          token: "demo-nora-confirm",
          status: "PENDING",
        },
      },
    },
  });

  const deals: {
    id: string;
    sponsorId: string;
    kind: DealKind;
    title: string;
    blurb: string;
    market: string;
    sizeBand: string;
    assetClass: string;
    raiseLabel: string;
    targetIrr?: string;
    minCheck?: string;
    equityMultiple?: string;
    roleNeeded?: MemberRole;
    deadline?: string;
    stage: string;
    need: string;
    hours: number;
  }[] = [
    {
      id: "deal_newark",
      sponsorId: "user_mh",
      kind: "DEAL",
      title: "18-unit multifamily, Newark NJ",
      blurb: "Value-add, 92% occupied. Closing in 45 days. Member note only — not an offer to sell.",
      market: "NJ",
      sizeBand: "1-5",
      assetClass: "Multifamily",
      raiseLabel: "$2.5M",
      targetIrr: "17.4%",
      minCheck: "$100K",
      equityMultiple: "1.8x",
      stage: "stabilized",
      need: "equity",
      hours: 2,
    },
    {
      id: "deal_edison",
      sponsorId: "user_pa",
      kind: "DEAL",
      title: "Self-storage portfolio, Edison NJ",
      blurb: "Three stabilized facilities, one lease-up. 6-year hold.",
      market: "NJ",
      sizeBand: "1-5",
      assetClass: "Storage",
      raiseLabel: "$4.0M",
      targetIrr: "15.1%",
      minCheck: "$250K",
      equityMultiple: "1.6x",
      stage: "stabilized",
      need: "equity",
      hours: 26,
    },
    {
      id: "deal_hoboken",
      sponsorId: "user_ev",
      kind: "SEEKING",
      title: "Mixed-use, 40k sf — Hoboken NJ",
      blurb: "Ground-up mixed-use, entitled. Union-friendly, bid by Nov 15.",
      market: "NJ",
      sizeBand: "scope",
      assetClass: "Mixed-use",
      raiseLabel: "40k sf",
      roleNeeded: "GENERAL_CONTRACTOR",
      deadline: "Bids Nov 15",
      stage: "pre-construction",
      need: "gc",
      hours: 5,
    },
    {
      id: "deal_brooklyn",
      sponsorId: "user_dw",
      kind: "DEAL",
      title: "64-unit adaptive reuse, Brooklyn NY",
      blurb: "Former warehouse conversion. Fictional incentives. Not an offer to sell.",
      market: "NY",
      sizeBand: "5+",
      assetClass: "Multifamily",
      raiseLabel: "$9.5M",
      targetIrr: "16.2%",
      minCheck: "$500K",
      equityMultiple: "1.9x",
      stage: "construction",
      need: "equity",
      hours: 72,
    },
    {
      id: "deal_jc",
      sponsorId: "user_mh",
      kind: "DEAL",
      title: "Retail/office condo, Jersey City NJ",
      blurb: "Street-level retail with two floors of creative office.",
      market: "NJ",
      sizeBand: "1-5",
      assetClass: "Mixed-use",
      raiseLabel: "$1.8M",
      targetIrr: "13.8%",
      minCheck: "$50K",
      equityMultiple: "1.5x",
      stage: "stabilized",
      need: "equity",
      hours: 96,
    },
    {
      id: "deal_brarch",
      sponsorId: "user_dw",
      kind: "SEEKING",
      title: "Design team for 64-unit conversion, Brooklyn NY",
      blurb: "Seeking an architect and a structural engineer for the conversion.",
      market: "NY",
      sizeBand: "scope",
      assetClass: "Multifamily",
      raiseLabel: "64 units",
      roleNeeded: "ARCHITECT_ENGINEER",
      deadline: "RFP Dec 1",
      stage: "construction",
      need: "advisory",
      hours: 6,
    },
    {
      id: "deal_nzone",
      sponsorId: "user_mh",
      kind: "SEEKING",
      title: "Variance counsel for Newark mixed-use site",
      blurb: "Need NJ-admitted land use counsel for a use variance hearing.",
      market: "NJ",
      sizeBand: "scope",
      assetClass: "Mixed-use",
      raiseLabel: "1 parcel",
      roleNeeded: "ZONING_ATTORNEY",
      deadline: "Hearing Jan 14",
      stage: "land",
      need: "advisory",
      hours: 48,
    },
    {
      id: "deal_edlend",
      sponsorId: "user_pa",
      kind: "SEEKING",
      title: "Construction loan for storage expansion, Edison NJ",
      blurb: "Seeking a lender for a construction facility on a fourth storage building.",
      market: "NJ",
      sizeBand: "1-5",
      assetClass: "Storage",
      raiseLabel: "$3.2M",
      roleNeeded: "LENDER",
      deadline: "Term sheets Nov 30",
      stage: "pre-construction",
      need: "debt",
      hours: 70,
    },
  ];

  for (const deal of deals) {
    const { hours, ...data } = deal;
    await prisma.deal.create({ data: { ...data, createdAt: hoursAgo(hours) } });
    await prisma.post.create({
      data: {
        authorId: data.sponsorId,
        kind: data.kind,
        dealId: data.id,
        title: data.title,
        body: data.blurb,
        market: data.market,
        assetClass: data.assetClass,
        stage: data.stage,
        need: data.need,
        sizeRange: data.raiseLabel,
        createdAt: hoursAgo(hours),
      },
    });
  }

  const note = await prisma.post.create({
    data: {
      authorId: "user_dp",
      kind: "NORMAL",
      body: "Cap rates in NJ garden-apartment product are holding steady while lenders get pickier on DSCR. Anyone seeing different bridge terms this quarter?",
      createdAt: hoursAgo(20),
    },
  });
  await prisma.like.create({ data: { userId: "user_mh", postId: note.id } });
  await prisma.comment.create({
    data: {
      postId: note.id,
      authorId: "user_rk",
      body: "Seeing the same on a 12-unit in Hudson County. Debt quotes moved 25 bps wider.",
      createdAt: hoursAgo(18),
    },
  });

  await prisma.dealAccess.create({
    data: {
      dealId: "deal_newark",
      requesterId: "user_tn",
      status: "APPROVED",
      ndaAcknowledged: true,
      ndaAcknowledgedAt: hoursAgo(10),
      reviewedAt: hoursAgo(8),
    },
  });
  await prisma.dealAccess.create({
    data: {
      dealId: "deal_newark",
      requesterId: "user_rk",
      status: "PENDING",
      ndaAcknowledged: true,
      ndaAcknowledgedAt: hoursAgo(3),
    },
  });

  const pairs: [string, string, "PENDING" | "ACCEPTED"][] = [
    ["user_mh", "user_pa", "ACCEPTED"],
    ["user_mh", "user_rk", "ACCEPTED"],
    ["user_mh", "user_ev", "ACCEPTED"],
    ["user_tn", "user_mh", "PENDING"],
    ["user_dp", "user_pa", "ACCEPTED"],
  ];
  for (const [fromId, toId, status] of pairs) {
    await prisma.connection.create({ data: { fromId, toId, status } });
  }

  const threads: { a: string; b: string; lines: { from: string; body: string; read: boolean }[] }[] = [
    {
      a: "user_mh",
      b: "user_rk",
      lines: [{ from: "user_rk", body: "Happy to review the deck. Can you send the latest numbers?", read: false }],
    },
    {
      a: "user_mh",
      b: "user_pa",
      lines: [
        { from: "user_mh", body: "Hi Priya, I'm interested in how you structured the storage hold.", read: true },
        { from: "user_pa", body: "Happy to compare notes. Nothing here is an offer to invest.", read: true },
      ],
    },
    {
      a: "user_ev",
      b: "user_mh",
      lines: [{ from: "user_ev", body: "Bids are due Nov 15. I can walk the Hoboken site Thursday.", read: true }],
    },
  ];

  for (const thread of threads) {
    const [userAId, userBId] = thread.a < thread.b ? [thread.a, thread.b] : [thread.b, thread.a];
    const conversation = await prisma.conversation.create({ data: { userAId, userBId, updatedAt: hoursAgo(1) } });
    let index = 0;
    for (const line of thread.lines) {
      index += 1;
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: line.from,
          body: line.body,
          createdAt: hoursAgo(index),
          readAt: line.read ? hoursAgo(index - 0.5) : null,
        },
      });
    }
  }

  await prisma.report.create({
    data: {
      reporterId: "user_ev",
      targetUserId: "user_bk",
      reason: "Asked to continue the conversation on a personal phone number.",
    },
  });

  await prisma.dealDocument.create({
    data: {
      dealId: "deal_newark",
      authorId: "user_mh",
      title: "Offering summary",
      url: "https://example.com/newark-summary",
      note: "Link placeholder. Nothing is uploaded to Private Floor.",
      createdAt: hoursAgo(12),
    },
  });
  const question = await prisma.dealMessage.create({
    data: {
      dealId: "deal_newark",
      authorId: "user_tn",
      body: "Is the rent roll the trailing twelve, or a pro forma?",
      createdAt: hoursAgo(9),
    },
  });
  await prisma.dealMessage.create({
    data: {
      dealId: "deal_newark",
      authorId: "user_mh",
      parentId: question.id,
      body: "Trailing twelve. Happy to walk the line items in the room.",
      createdAt: hoursAgo(8),
    },
  });
  await prisma.dealEvent.createMany({
    data: [
      {
        dealId: "deal_newark",
        actorId: "user_mh",
        summary: "Marcus Hale approved Tara Nguyen into the room.",
        createdAt: hoursAgo(8),
      },
      {
        dealId: "deal_newark",
        actorId: "user_mh",
        summary: "Marcus Hale added a document link: Offering summary.",
        createdAt: hoursAgo(12),
      },
      {
        dealId: "deal_newark",
        actorId: "user_tn",
        summary: "Tara Nguyen asked a question.",
        createdAt: hoursAgo(9),
      },
    ],
  });
  await prisma.notification.createMany({
    data: [
      {
        userId: "user_mh",
        title: "Access request",
        body: "Rachel Kim requested access to 18-unit multifamily, Newark NJ.",
        href: "/deals/deal_newark",
        createdAt: hoursAgo(3),
      },
      {
        userId: "user_mh",
        title: "Connection request",
        body: "Tara Nguyen wants to connect.",
        href: "/network",
        createdAt: hoursAgo(2),
      },
      {
        userId: "user_mh",
        title: "New message",
        body: "Rachel Kim: Happy to review the deck. Can you send the latest numbers?",
        href: "/messages",
        createdAt: hoursAgo(1),
      },
    ],
  });

  await ensureExtraProjects();
  await alignProjectContactDemo();
  await alignMapleCourtDemo();
  await seedVerification();

  console.log(`Seeded ${BRAND.name} demo data. Password for every member: cornicio-demo`);
}

async function ensureMissingVerificationCases() {
  const users = await prisma.user.findMany({ select: { id: true, memberVerification: { select: { id: true } } } });
  for (const user of users) {
    if (user.memberVerification) continue;
    await prisma.verificationCase.create({
      data: {
        subject: "MEMBER",
        userId: user.id,
        status: "NOT_STARTED",
        checks: { create: MEMBER_CHECKS.map((item) => ({ key: item.key, label: item.label })) },
        events: { create: { toStatus: "NOT_STARTED", summary: "Verification case opened." } },
      },
    });
  }
  const projects = await prisma.trackProject.findMany({ select: { id: true, verification: { select: { id: true } } } });
  for (const project of projects) {
    if (project.verification) continue;
    await prisma.verificationCase.create({
      data: {
        subject: "PROJECT",
        projectId: project.id,
        status: "NOT_STARTED",
        checks: { create: PROJECT_CHECKS.map((item) => ({ key: item.key, label: item.label })) },
        events: { create: { toStatus: "NOT_STARTED", summary: "Verification case opened." } },
      },
    });
  }
}

async function seedVerification() {
  const users = await prisma.user.findMany({ select: { id: true } });
  const projects = await prisma.trackProject.findMany({ select: { id: true } });
  for (const user of users) {
    await prisma.verificationCase.create({
      data: {
        subject: "MEMBER",
        userId: user.id,
        status: "NOT_STARTED",
        checks: { create: MEMBER_CHECKS.map((item) => ({ key: item.key, label: item.label })) },
        events: { create: { actorId: "user_mh", toStatus: "NOT_STARTED", summary: "Verification case opened." } },
      },
    });
  }
  for (const project of projects) {
    await prisma.verificationCase.create({
      data: {
        subject: "PROJECT",
        projectId: project.id,
        status: "NOT_STARTED",
        checks: { create: PROJECT_CHECKS.map((item) => ({ key: item.key, label: item.label })) },
        events: { create: { actorId: "user_mh", toStatus: "NOT_STARTED", summary: "Verification case opened." } },
      },
    });
  }

  await alignSeedTiers();
  await applySeedCaseMap();
  await ensureDemoAccessAndNotices();
  await ensureCategoryDemoMembers();
  await ensureMapleCourtDealRoom();
}

const DEMO_PROJECT_FIELDS: Record<string, { stage: string; need: string }> = {
  deal_newark: { stage: "stabilized", need: "equity" },
  deal_edison: { stage: "stabilized", need: "equity" },
  deal_hoboken: { stage: "pre-construction", need: "gc" },
  deal_brooklyn: { stage: "construction", need: "equity" },
  deal_jc: { stage: "stabilized", need: "equity" },
  deal_brarch: { stage: "construction", need: "advisory" },
  deal_nzone: { stage: "land", need: "advisory" },
  deal_edlend: { stage: "pre-construction", need: "debt" },
};

async function fillDemoProjectFields() {
  for (const [id, fields] of Object.entries(DEMO_PROJECT_FIELDS)) {
    const deal = await prisma.deal.findUnique({
      where: { id },
      select: { id: true, stage: true, market: true, assetClass: true, title: true },
    });
    if (!deal) continue;
    if (!deal.stage) await prisma.deal.update({ where: { id }, data: fields });
    const posts = await prisma.post.findMany({
      where: { dealId: id },
      select: { id: true, stage: true, need: true, market: true, title: true, assetClass: true },
    });
    for (const post of posts) {
      if (post.stage && post.need && post.market && post.title && post.assetClass) continue;
      await prisma.post.update({
        where: { id: post.id },
        data: {
          stage: post.stage || fields.stage,
          need: post.need || fields.need,
          market: post.market || deal.market,
          title: post.title || deal.title,
          assetClass: post.assetClass || deal.assetClass,
        },
      });
    }
  }
}

async function dedupeDanielReyes() {
  const rows = await prisma.user.findMany({
    where: { name: "Daniel Reyes", isAdmin: false },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, isTest: true, isAdmin: true, createdAt: true },
  });
  for (const id of duplicateExampleIds(rows)) {
    await deleteMemberAccount(id);
  }
}

async function alignSeededDemo() {
  await dedupeDanielReyes();
  await fillDemoProjectFields();
  await ensureExtraProjects();
  await alignProjectContactDemo();
  await alignMapleCourtDemo();
  await ensureMissingVerificationCases();
  await alignSeedTiers();
  await applySeedCaseMap();
  await ensureDemoAccessAndNotices();
  await ensureCategoryDemoMembers();
  await ensureMapleCourtDealRoom();
  await ensureRoleDemo();
  await ensureMultiCategoryDemo();
}

async function ensureExtraProjects() {
  for (const project of SEEDED_EXTRA_PROJECTS) {
    const owner = await prisma.user.findUnique({ where: { id: project.userId }, select: { id: true } });
    if (!owner) continue;
    await prisma.trackProject.upsert({
      where: { id: project.id },
      create: { ...project },
      update: {
        name: project.name,
        asset: project.asset,
        location: project.location,
        year: project.year,
        valueLabel: project.valueLabel,
        summary: project.summary,
        userId: project.userId,
      },
    });
  }
  const project = await prisma.trackProject.findUnique({ where: { id: "proj_raritan" }, select: { id: true } });
  if (!project) return;
  await prisma.confirmation.upsert({
    where: { token: "demo-raritan-confirmed" },
    update: { status: "CONFIRMED", reviewStatus: "APPROVED", projectId: project.id },
    create: {
      projectId: project.id,
      counterpartyName: "Leo Sandoval",
      counterpartyEmail: "leo.sandoval@gsbridge.example",
      token: "demo-raritan-confirmed",
      status: "CONFIRMED",
      reviewStatus: "APPROVED",
      note: "We financed the storage hold.",
      respondedAt: hoursAgo(24 * 15),
    },
  });
}

async function alignSeedTiers() {
  for (const [id, file] of Object.entries(SEEDED_MEMBER_FILES)) {
    let tier: "INVITED" | "CONFIRMED" = file.tier;
    if (tier === "CONFIRMED") {
      const approved = await prisma.confirmation.count({
        where: { reviewStatus: "APPROVED", project: { userId: id } },
      });
      if (approved === 0) tier = "INVITED";
    }
    await prisma.user.updateMany({ where: { id }, data: { tier } });
  }
}

async function applySeedCaseMap() {
  const verifiedAt = hoursAgo(24 * 12);
  const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 400);
  const expiredAt = new Date("2025-06-01T00:00:00.000Z");
  for (const [userId, file] of Object.entries(SEEDED_MEMBER_FILES)) {
    await applyOneCase({ userId }, file.status, file.note, Boolean(file.expired), verifiedAt, file.expired ? expiredAt : future);
  }
  for (const [projectId, file] of Object.entries(SEEDED_PROJECT_FILES)) {
    await applyOneCase({ projectId }, file.status, file.note, false, verifiedAt, future);
  }
}

async function applyOneCase(
  where: { userId: string } | { projectId: string },
  status: VerificationStatus,
  note: string,
  expired: boolean,
  verifiedAt: Date,
  expiresAt: Date,
) {
  const record = await prisma.verificationCase.findFirst({ where, include: { checks: true } });
  if (!record) return;
  const data: {
    status: VerificationStatus;
    internalNote: string;
    verifiedAt?: Date;
    expiresAt?: Date;
  } = { status, internalNote: note };
  if (status === "VERIFIED") {
    data.verifiedAt = record.verifiedAt ?? verifiedAt;
    data.expiresAt = expired ? expiresAt : record.expiresAt && record.expiresAt.getTime() > Date.now() ? record.expiresAt : expiresAt;
  }
  const changed = record.status !== status || record.internalNote !== note;
  await prisma.verificationCase.update({ where: { id: record.id }, data });
  if (status === "VERIFIED") {
    await prisma.verificationCheck.updateMany({
      where: { caseId: record.id },
      data: { result: "PASS", note, reviewerId: "user_mh", reviewedAt: verifiedAt },
    });
  }
  if ("userId" in where && status === "NEEDS_INFO") {
    await prisma.verificationCheck.updateMany({
      where: { caseId: record.id, key: "license" },
      data: { result: "NEEDS_INFO", note, reviewerId: "user_mh", reviewedAt: hoursAgo(6) },
    });
  }
  if ("projectId" in where && status === "NEEDS_INFO") {
    await prisma.verificationCheck.updateMany({
      where: { caseId: record.id, key: "title" },
      data: { result: "NEEDS_INFO", note, reviewerId: "user_mh", reviewedAt: hoursAgo(6) },
    });
  }
  if (status === "REJECTED") {
    await prisma.verificationCheck.updateMany({
      where: { caseId: record.id, key: "sanctions" },
      data: { result: "FAIL", note, reviewerId: "user_mh", reviewedAt: hoursAgo(6) },
    });
  }
  if (changed) {
    await prisma.verificationEvent.create({
      data: {
        caseId: record.id,
        actorId: "user_mh",
        fromStatus: record.status,
        toStatus: status,
        summary: expired ? "Seed alignment set this file to expired." : `Seed alignment set this file to ${status}.`,
      },
    });
  }
}

async function ensureDemoAccessAndNotices() {
  const hoboken = await prisma.deal.findUnique({ where: { id: "deal_hoboken" }, select: { id: true } });
  if (hoboken) {
    const daniel = await prisma.user.findUnique({ where: { id: "user_dp" }, select: { id: true } });
    const julian = await prisma.user.findUnique({ where: { id: "user_jw" }, select: { id: true } });
    if (daniel) {
      await prisma.dealAccess.upsert({
        where: { dealId_requesterId: { dealId: hoboken.id, requesterId: daniel.id } },
        update: {},
        create: {
          dealId: hoboken.id,
          requesterId: daniel.id,
          status: "PENDING",
          ndaAcknowledged: true,
          ndaAcknowledgedAt: hoursAgo(2),
        },
      });
    }
    if (julian) {
      await prisma.dealAccess.upsert({
        where: { dealId_requesterId: { dealId: hoboken.id, requesterId: julian.id } },
        update: {},
        create: {
          dealId: hoboken.id,
          requesterId: julian.id,
          status: "APPROVED",
          ndaAcknowledged: true,
          ndaAcknowledgedAt: hoursAgo(30),
          reviewedAt: hoursAgo(20),
        },
      });
    }
  }
  await ensureSystemLine({
    a: "user_mh",
    b: "user_rk",
    from: "user_rk",
    kind: "ACCESS",
    body: `Rachel Kim requested access to "18-unit multifamily, Newark NJ" and acknowledged the NDA. Review it on the deal page.`,
  });
  await ensureSystemLine({
    a: "user_mh",
    b: "user_rk",
    from: "user_mh",
    kind: "ACCESS",
    body: `Marcus Hale approved your request for "18-unit multifamily, Newark NJ". Open the deal room.`,
  });
  await ensureSystemLine({
    a: "user_mh",
    b: "user_tn",
    from: "user_tn",
    kind: "DEAL",
    body: `Tara Nguyen asked a question in the deal room for 18-unit multifamily, Newark NJ: What is the current occupancy?`,
  });
  await syncOwnerPassword();
}

async function syncOwnerPassword() {
  const { syncAdminPasswords } = await import("../src/lib/admin-password");
  const result = await syncAdminPasswords();
  console.log(`ADMIN_PASSWORD result=${result}`);
}

async function ensureSystemLine(input: { a: string; b: string; from: string; kind: string; body: string }) {
  const people = await prisma.user.count({ where: { id: { in: [input.a, input.b, input.from] } } });
  if (people < 3 && input.from !== input.a && input.from !== input.b) return;
  if ((await prisma.user.count({ where: { id: { in: [input.a, input.b] } } })) < 2) return;
  const [userAId, userBId] = input.a < input.b ? [input.a, input.b] : [input.b, input.a];
  let conversation = await prisma.conversation.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
  if (!conversation) {
    conversation = await prisma.conversation.create({ data: { userAId, userBId } });
  }
  const existing = await prisma.message.findFirst({ where: { conversationId: conversation.id, body: input.body } });
  if (existing) {
    if (existing.kind !== input.kind) {
      await prisma.message.update({ where: { id: existing.id }, data: { kind: input.kind } });
    }
    return;
  }
  await prisma.message.create({
    data: { conversationId: conversation.id, senderId: input.from, body: input.body, kind: input.kind },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * Demo data for project review and the contact rule. Seeded projects get a street, city, state, role and the
 * categories they seek, once (a member's later edits stay). Marcus Hale also has one project pending review and one
 * sent back for more information, plus contact requests in each state.
 */
async function alignProjectContactDemo() {
  // Billing demo: Elena Voss (general contractor, a paid role) shows a paid TEST membership so Settings > Billing has data.
  await prisma.user.updateMany({
    where: { id: "user_ev", paymentStatus: "NOT_REQUIRED" },
    data: { paymentStatus: "PAID", paymentMode: "simulated", duesCents: 19_900, paidAt: new Date(), renewalAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  });
  const fields: Record<string, { street: string; city: string; state: string; role: string; seeking: string; share: boolean }> = {
    proj_ironbound: { street: "88 Ferry Street", city: "Newark", state: "NJ", role: "Developer", seeking: "FINANCING,EQUITY,GENERAL_CONTRACTOR", share: true },
    proj_halsey: { street: "120 Montgomery Street", city: "Jersey City", state: "NJ", role: "Developer", seeking: "ARCHITECT_ENGINEER,ZONING_ATTORNEY", share: false },
    proj_nora: { street: "", city: "Newark", state: "NJ", role: "Property Manager", seeking: "", share: false },
    proj_raritan: { street: "1500 Route 1", city: "Edison", state: "NJ", role: "Developer", seeking: "FINANCING", share: true },
    proj_waterfront: { street: "", city: "Jersey City", state: "NJ", role: "Architect / Engineer", seeking: "", share: false },
    proj_exchange: { street: "", city: "Jersey City", state: "NJ", role: "Developer", seeking: "EQUITY,RE_ATTORNEY", share: false },
    proj_hoboken: { street: "410 Washington Street", city: "Hoboken", state: "NJ", role: "General Contractor", seeking: "ARCHITECT_ENGINEER,FINANCING", share: true },
    proj_parsippany: { street: "", city: "Parsippany", state: "NJ", role: "Insurance (builder's risk, title, surety / bonding)", seeking: "", share: false },
  };
  for (const [id, value] of Object.entries(fields)) {
    const row = await prisma.trackProject.findUnique({ where: { id }, select: { city: true } });
    if (!row || row.city) continue;
    await prisma.trackProject.update({
      where: { id },
      data: { street: value.street, city: value.city, state: value.state, role: value.role, seeking: value.seeking, shareWithCircle: value.share, reviewStatus: "APPROVED" },
    });
  }
  const marcus = await prisma.user.findUnique({ where: { id: "user_mh" }, select: { id: true } });
  if (!marcus) return;
  await prisma.trackProject.upsert({
    where: { id: "proj_broad_townhomes" },
    update: {},
    create: {
      id: "proj_broad_townhomes",
      userId: "user_mh",
      name: "Broad Street Townhomes",
      asset: "Single family / townhome",
      street: "301 Broad Street",
      city: "Newark",
      state: "NJ",
      location: "Newark, NJ",
      year: 2027,
      valueLabel: "$14,500,000",
      role: "Developer",
      summary: "Eighteen for-sale townhomes. Construction start spring 2027.",
      seeking: "FINANCING,EQUITY",
      reviewStatus: "PENDING_REVIEW",
    },
  });
  await prisma.trackProject.upsert({
    where: { id: "proj_market_mixed" },
    update: {},
    create: {
      id: "proj_market_mixed",
      userId: "user_mh",
      name: "Market Street Mixed-Use",
      asset: "Mixed-use",
      street: "",
      city: "Newark",
      state: "NJ",
      location: "Newark, NJ",
      year: 2028,
      valueLabel: "$32,000,000",
      role: "Developer",
      summary: "Ground-floor retail with 60 apartments above.",
      seeking: "EQUITY",
      reviewStatus: "NEEDS_INFO",
      reviewNote: "Please add the street address and confirm your ownership or contract status on the site.",
      reviewedAt: hoursAgo(5),
    },
  });
  await prisma.deal.updateMany({ where: { id: "deal_newark", projectId: null, sponsorId: "user_mh" }, data: { projectId: "proj_ironbound" } });
  const docs = await prisma.projectDocument.count({ where: { projectId: "proj_ironbound" } });
  const ironbound = await prisma.trackProject.findUnique({ where: { id: "proj_ironbound" }, select: { id: true } });
  if (!docs && ironbound) {
    await prisma.projectDocument.create({
      data: {
        projectId: "proj_ironbound",
        title: "Ironbound Lofts rent roll (demo)",
        fileName: "ironbound-rent-roll-demo.pdf",
        contentType: "application/pdf",
        bytes: Buffer.from(DEMO_PDF),
        sizeBytes: Buffer.byteLength(DEMO_PDF),
      },
    });
  }
  // Example "new member matches your projects" alerts for the demo accounts (once per member pair).
  for (const id of ["user_mt", "user_gl", "user_rk", "user_hc", "user_jw"]) await alertNewMemberMatches(id);
  await prisma.notification.updateMany({ where: { audience: "member", href: { startsWith: "/admin" } }, data: { audience: "admin" } });
  const contacts: { projectId: string; fromId: string; toId: string; category: string; status: "PENDING" | "ACCEPTED" | "DECLINED"; note: string }[] = [
    { projectId: "proj_ironbound", fromId: "user_ls", toId: "user_mh", category: "FINANCING", status: "ACCEPTED", note: "We lend on value-add multifamily in Essex County." },
    { projectId: "proj_ironbound", fromId: "user_tn", toId: "user_mh", category: "EQUITY", status: "PENDING", note: "Interested in the LP piece. What is the hold period?" },
    { projectId: "proj_ironbound", fromId: "user_mh", toId: "user_mt", category: "FINANCING", status: "PENDING", note: "Looking at refinance options for 2026." },
    { projectId: "proj_halsey", fromId: "user_mh", toId: "user_gl", category: "ARCHITECT_ENGINEER", status: "DECLINED", note: "Facade study for the retail base." },
  ];
  for (const item of contacts) {
    const users = await prisma.user.count({ where: { id: { in: [item.fromId, item.toId] } } });
    const project = await prisma.trackProject.findUnique({ where: { id: item.projectId }, select: { id: true } });
    if (users < 2 || !project) continue;
    await prisma.projectContact.upsert({
      where: { projectId_fromId_toId: { projectId: item.projectId, fromId: item.fromId, toId: item.toId } },
      update: {},
      create: { ...item, decidedAt: item.status === "PENDING" ? null : hoursAgo(20) },
    });
  }
}

const DEMO_PDF = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 62>>stream\nBT /F1 18 Tf 72 720 Td (Ironbound Lofts rent roll - demo only) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n";

/** A sample project page: Marcus Hale's Maple Court Townhomes, with documents, photos, and contact requests. Idempotent. */
async function alignMapleCourtDemo() {
  const id = "proj_maple_court";
  const owner = await prisma.user.findUnique({ where: { id: "user_mh" }, select: { id: true } });
  if (!owner) return;
  const existing = await prisma.trackProject.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    await prisma.trackProject.create({
      data: {
        id,
        userId: owner.id,
        name: "Sample: Maple Court Townhomes",
        asset: "Single family / townhome",
        street: "40 Maple Court",
        city: "Montclair",
        state: "NJ",
        location: "Montclair, NJ",
        year: 2028,
        valueLabel: "$18,000,000",
        role: "Developer",
        summary:
          "24 for-sale townhome and single-family units on 3.1 acres, five minutes from Bay Street station. Site plan approval in hand; construction start targeted for spring 2027.\nLooking for a general contractor, construction financing, and an architect to take the schematic design through construction documents.",
        seeking: "GENERAL_CONTRACTOR,FINANCING,ARCHITECT_ENGINEER",
        shareWithCircle: true,
        reviewStatus: "APPROVED",
        submittedAt: new Date(),
        reviewedAt: new Date(),
      },
    });
  }
  const docCount = await prisma.projectDocument.count({ where: { projectId: id } });
  if (docCount === 0) {
    const sharp = (await import("sharp")).default;
    const photo = async (label: string, sky: string, body: string) =>
      new Uint8Array(
        await sharp(
          Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="${sky}"/><rect y="640" width="1200" height="260" fill="#6f8a5b"/>` +
              Array.from({ length: 6 }, (_, i) => `<rect x="${60 + i * 185}" y="380" width="170" height="270" fill="${body}" stroke="#3b3b3b" stroke-width="4"/><polygon points="${50 + i * 185},385 ${145 + i * 185},290 ${240 + i * 185},385" fill="#5a4636"/><rect x="${120 + i * 185}" y="540" width="50" height="110" fill="#2f3e46"/>`).join("") +
              `<text x="40" y="70" font-family="sans-serif" font-size="44" fill="#1f2b24">${label}</text></svg>`,
          ),
        )
          .png()
          .toBuffer(),
      );
    const front = await photo("Maple Court, street view (rendering)", "#cfe0ea", "#e8dcc6");
    const rear = await photo("Maple Court, courtyard (rendering)", "#e9d8c4", "#d8d0c0");
    const pdf = new Uint8Array(Buffer.from(samplePdf("Maple Court Townhomes - Site plan summary (sample)")));
    await prisma.projectDocument.createMany({
      data: [
        { projectId: id, title: "Site plan summary", fileName: "maple-court-site-plan.pdf", contentType: "application/pdf", sizeBytes: pdf.byteLength, bytes: pdf },
        { projectId: id, title: "Street view rendering", fileName: "maple-court-street.png", contentType: "image/png", sizeBytes: front.byteLength, bytes: front },
        { projectId: id, title: "Courtyard rendering", fileName: "maple-court-courtyard.png", contentType: "image/png", sizeBytes: rear.byteLength, bytes: rear },
      ],
    });
  }
  const contacts = [
    { fromId: "user_mt", category: "FINANCING", status: "PENDING", note: "We lend on for-sale townhome projects in Essex County. Happy to look at the budget." },
    { fromId: "user_gl", category: "ARCHITECT_ENGINEER", status: "ACCEPTED", note: "Our studio has done three Montclair infill projects. Would welcome a call." },
  ] as const;
  for (const c of contacts) {
    const from = await prisma.user.findUnique({ where: { id: c.fromId }, select: { id: true } });
    if (!from) continue;
    await prisma.projectContact.upsert({
      where: { projectId_fromId_toId: { projectId: id, fromId: c.fromId, toId: owner.id } },
      update: {},
      create: { projectId: id, fromId: c.fromId, toId: owner.id, category: c.category, note: c.note, status: c.status },
    });
  }
}

/** A one-page PDF with a title line, for sample documents. */
function samplePdf(title: string): string {
  const text = title.replace(/[()\\]/g, "");
  const stream = `BT /F1 20 Tf 60 720 Td (${text}) Tj 0 -40 Td /F1 12 Tf (24 units - 3.1 acres - Montclair, NJ - sample document for the demo) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return out;
}

/** #41 one fictional demo member per new category, so "Find a [category]" has someone to show. Idempotent. */
const CATEGORY_DEMO: Person[] = [
  { id: "user_sv", email: "sam.verga@vergasurvey.example", name: "Sam Verga", initials: "SV", role: "SURVEYOR", org: "Verga Land Surveying", location: "Morristown, NJ", tier: "INVITED", credentialNote: "NJ Professional Land Surveyor (demo)", bio: "ALTA, boundary, and topographic surveys. Fictional." },
  { id: "user_tc", email: "tanya.cole@gardentitle.example", name: "Tanya Cole", initials: "TC", role: "TITLE_COMPANY", org: "Garden State Title Agency", location: "Newark, NJ", tier: "INVITED", credentialNote: "NJ title producer license (demo)", bio: "Commercial title and closings. Fictional." },
  { id: "user_ec", email: "erin.chu@chuenviro.example", name: "Erin Chu", initials: "EC", role: "ENVIRONMENTAL_CONSULTANT", org: "Chu Environmental", location: "Edison, NJ", tier: "INVITED", credentialNote: "NJ LSRP (demo)", bio: "Phase I / II and remediation. Fictional." },
  { id: "user_gb", email: "gabe.byrne@byrnegeo.example", name: "Gabe Byrne", initials: "GB", role: "GEOTECH_ENGINEER", org: "Byrne Geotechnical", location: "Paramus, NJ", tier: "INVITED", credentialNote: "NJ PE (demo)", bio: "Borings and foundation reports. Fictional." },
  { id: "user_cn", email: "carla.nunez@nunezcivil.example", name: "Carla Nunez", initials: "CN", role: "CIVIL_ENGINEER", org: "Nunez Civil Engineering", location: "Clifton, NJ", tier: "INVITED", credentialNote: "NJ PE (demo)", bio: "Site plans, grading, and utilities. Fictional." },
  { id: "user_sk", email: "sid.kapoor@kapoorstructural.example", name: "Sid Kapoor", initials: "SK", role: "STRUCTURAL_ENGINEER", org: "Kapoor Structural", location: "Jersey City, NJ", tier: "INVITED", credentialNote: "NJ PE (demo)", bio: "Mid-rise wood and podium structures. Fictional." },
  { id: "user_pe", email: "paula.estes@estespermits.example", name: "Paula Estes", initials: "PE", role: "PERMIT_EXPEDITER", org: "Estes Permit Services", location: "Montclair, NJ", tier: "INVITED", credentialNote: "Business card matched to public records", bio: "Building permits across Essex County. Fictional." },
  { id: "user_mr", email: "max.romero@romeromep.example", name: "Max Romero", initials: "MR", role: "MEP_ENGINEER", org: "Romero MEP", location: "Hackensack, NJ", tier: "INVITED", credentialNote: "NJ PE (demo)", bio: "Mechanical, electrical, and plumbing design. Fictional." },
  { id: "user_bh", email: "beth.hale@keystonebond.example", name: "Beth Haley", initials: "BH", role: "SURETY_BONDING", org: "Keystone Surety", location: "Parsippany, NJ", tier: "INVITED", credentialNote: "NJ surety producer (demo)", bio: "Performance and payment bonds. Fictional." },
];

async function ensureCategoryDemoMembers() {
  for (const [index, person] of CATEGORY_DEMO.entries()) {
    const exists = await prisma.user.findUnique({ where: { id: person.id }, select: { id: true } });
    if (exists) continue;
    const taken = await prisma.user.findUnique({ where: { email: person.email }, select: { id: true } });
    if (taken) continue;
    await prisma.user.create({ data: { ...person, passwordHash, isAdmin: false, status: "ACTIVE", phone: `201-555-${String(2000 + index)}`, seenWelcome: true } });
  }
}

const daysFromNow = (days: number) => {
  const date = new Date(Date.now() + days * 86_400_000);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12));
};

/** #41 Maple Court deal room with a filled-in due-diligence checklist. Idempotent: built once. */
async function ensureMapleCourtDealRoom() {
  const project = await prisma.trackProject.findUnique({ where: { id: "proj_maple_court" }, select: { id: true } });
  if (!project) return;
  const id = "deal_maple_court";
  const existing = await prisma.deal.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    await prisma.deal.create({
      data: {
        id,
        sponsorId: "user_mh",
        kind: "SEEKING",
        title: "Sample: Maple Court Townhomes",
        blurb: "24 for-sale townhomes on 3.1 acres in Montclair. Site plan approval in hand.",
        market: "NJ",
        sizeBand: "$5M – $25M",
        assetClass: "Single family / townhome",
        raiseLabel: "",
        stage: "pre-construction",
        need: "gc",
        projectId: project.id,
      },
    });
  }
  for (const requesterId of ["user_ev", "user_gl", "user_ls"]) {
    const person = await prisma.user.findUnique({ where: { id: requesterId }, select: { id: true } });
    if (!person) continue;
    await prisma.dealAccess.upsert({
      where: { dealId_requesterId: { dealId: id, requesterId } },
      update: {},
      create: { dealId: id, requesterId, status: "APPROVED", ndaAcknowledged: true, ndaAcknowledgedAt: hoursAgo(72), reviewedAt: hoursAgo(70) },
    });
  }
  if ((await prisma.dealChecklistItem.count({ where: { dealId: id } })) > 0) return;
  type Row = [string, string, string, string, string | null, number | null, string, number];
  // section, title, category, status, assignee, due (days from now), file name, comments
  const rows: Row[] = [
    ["Site & Title", "Boundary and topographic survey", "SURVEYOR", "DONE", "user_mh", -21, "Maple-Court-survey.pdf", 2],
    ["Site & Title", "Title report and commitment", "TITLE_COMPANY", "DONE", "user_mh", -18, "Title-commitment-2026-1187.pdf", 1],
    ["Site & Title", "Phase I environmental site assessment", "ENVIRONMENTAL_CONSULTANT", "DONE", "user_mh", -15, "Phase-I-ESA-final.pdf", 1],
    ["Site & Title", "Geotechnical report", "GEOTECH_ENGINEER", "NEEDED", null, 7, "", 0],
    ["Approvals & Permits", "Zoning approval", "ZONING_ATTORNEY", "DONE", "user_mh", -28, "Montclair-ZBA-resolution.pdf", 0],
    ["Approvals & Permits", "Structural drawings", "STRUCTURAL_ENGINEER", "NEEDED", null, 14, "", 0],
    ["Approvals & Permits", "Building permit", "PERMIT_EXPEDITER", "IN_PROGRESS", "user_ev", -4, "", 2],
    ["Approvals & Permits", "Utility will-serve letters", "CIVIL_ENGINEER", "IN_PROGRESS", "user_mh", 9, "", 1],
    ["Budget & Financing", "GC budget", "GENERAL_CONTRACTOR", "DONE", "user_ev", -6, "GC-budget-v2.xlsx", 2],
    ["Budget & Financing", "Lender term sheet", "FINANCING", "DONE", "user_ls", -10, "Term-sheet-signed.pdf", 1],
    ["Budget & Financing", "Appraisal", "APPRAISER", "IN_PROGRESS", "user_ls", 13, "", 0],
    ["Insurance", "Builder's risk policy", "INSURANCE", "NEEDED", "user_mh", 16, "", 0],
    ["Insurance", "GC certificate of insurance", "GENERAL_CONTRACTOR", "DONE", "user_ev", -8, "Voss-Reed-COI-2026.pdf", 0],
    ["Insurance", "Performance and payment bonds", "SURETY_BONDING", "NEEDED", null, 21, "", 0],
    ["Contracts", "GC agreement", "RE_ATTORNEY", "IN_PROGRESS", "user_ev", 11, "", 3],
    ["Contracts", "Architect agreement", "ARCHITECT_ENGINEER", "DONE", "user_gl", -30, "Architect-B101-executed.pdf", 1],
  ];
  const remarks = ["Uploaded the final version.", "Looks good to me.", "Resubmitting the fire separation sheets Monday."];
  const pdf = Buffer.from(DEMO_PDF);
  for (const [position, [section, title, category, status, assigneeId, due, fileName, comments]] of rows.entries()) {
    const item = await prisma.dealChecklistItem.create({
      data: {
        dealId: id, section, title, category, status, assigneeId, position,
        dueDate: due === null ? null : daysFromNow(due),
        ...(fileName ? { fileName, contentType: fileName.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf", sizeBytes: pdf.byteLength, bytes: pdf, fileAt: hoursAgo(24 * (position + 1)) } : {}),
      },
    });
    for (let index = 0; index < comments; index += 1) {
      await prisma.dealChecklistComment.create({ data: { itemId: item.id, authorId: index % 2 ? "user_mh" : assigneeId ?? "user_mh", body: remarks[index % remarks.length], createdAt: hoursAgo(30 - index) } });
    }
  }
  const events: [string, string, number][] = [
    ["user_ev", "Elena Voss uploaded GC-budget-v2.xlsx to GC budget", 2],
    ["user_ls", "Leo Sandoval marked Lender term sheet done", 5],
    ["user_mh", "Marcus Hale commented on Building permit: “Resubmitting the fire separation sheets Monday.”", 26],
    ["user_ev", "Elena Voss uploaded Voss-Reed-COI-2026.pdf to GC certificate of insurance", 48],
    ["user_gl", "Grace Liu marked Architect agreement done", 70],
  ];
  for (const [actorId, summary, hours] of events) await prisma.dealEvent.create({ data: { dealId: id, actorId, summary, createdAt: hoursAgo(hours) } });
}

/** Overnight: one filled, role-fitting profile per main member type, plus role facts on demo projects. Only fills blanks. */
async function ensureRoleDemo() {
  const profiles: Record<string, { specialties: string; licenses?: string; typicalJobSize?: string; insuranceInfo?: string; privateTerms?: string; yearsInBusiness?: string }> = {
    user_ls: { specialties: "Construction, bridge, mini-perm", licenses: "NJ licensed lender (commercial, exempt from residential licensing)", typicalJobSize: "$3M to $40M", privateTerms: "Demo only: construction pricing quoted per deal.", yearsInBusiness: "14" },
    user_mt: { specialties: "Construction, DSCR, bridge, agency", licenses: "NMLS 1987432 (individual), NMLS 402211 (company)", typicalJobSize: "$1M to $25M", privateTerms: "Demo only: fee quoted per placement.", yearsInBusiness: "9" },
    user_tn: { specialties: "Multifamily, mixed-use; value-add and ground-up", licenses: "Accredited investor", typicalJobSize: "$500K to $5M", yearsInBusiness: "11" },
    user_rk: { specialties: "Ground-up multifamily, long hold", licenses: "Accredited investor, qualified purchaser", typicalJobSize: "$1M to $15M", yearsInBusiness: "20" },
    user_ev: { specialties: "Concrete, framing, general conditions" },
    user_gl: { specialties: "Multifamily, mixed-use, adaptive reuse", licenses: "NJ Registered Architect AI 21AI01884500", typicalJobSize: "20 to 200 units", insuranceInfo: "Professional liability $2M", yearsInBusiness: "16" },
    user_hc: { specialties: "Acquisitions, construction contracts, JV agreements", licenses: "Bar: NJ 2008, NY 2009", typicalJobSize: "$5M to $100M", yearsInBusiness: "17" },
    user_sr: { specialties: "Reg D 506(b)/(c) offerings, fund formation", licenses: "Bar: NY 2006, NJ 2007", typicalJobSize: "$2M to $50M", yearsInBusiness: "18" },
    user_jw: { specialties: "Use variances, site plan, redevelopment plans", licenses: "Bar: NJ 2004", typicalJobSize: "10 to 300 units", yearsInBusiness: "21" },
    user_op: { specialties: "Builder's risk, general liability, umbrella, OCIP", licenses: "NJ producer license 1045523", typicalJobSize: "$5M to $75M", yearsInBusiness: "12" },
  };
  for (const [id, data] of Object.entries(profiles)) {
    const user = await prisma.user.findUnique({ where: { id }, select: { specialties: true, licenses: true, typicalJobSize: true, insuranceInfo: true, privateTerms: true, yearsInBusiness: true } });
    if (!user) continue;
    const patch: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) if (value && !(user as Record<string, string | null>)[key]) patch[key] = value;
    if (Object.keys(patch).length) await prisma.user.update({ where: { id }, data: patch });
  }
  // A demo member per type should look complete: fill markets and an offering line where blank.
  for (const id of Object.keys(profiles)) {
    const user = await prisma.user.findUnique({ where: { id }, select: { markets: true, offering: true, bio: true, lookingFor: true } });
    if (!user) continue;
    const patch: Record<string, string> = {};
    if (user.markets.trim().length < 2) patch.markets = "NJ, NY";
    if (user.offering.trim().length < 2 && user.bio.trim().length < 2 && user.lookingFor.trim().length < 2) patch.offering = profiles[id].specialties;
    if (Object.keys(patch).length) await prisma.user.update({ where: { id }, data: patch });
  }
  const facts: Record<string, Record<string, string>> = {
    proj_maple_court: { stage: "Pre-construction", units: "48", scope: "Ground-up, 4 stories wood frame over podium", startDate: "2027-03", bidDue: "2026-12-15", designStage: "Construction documents", loanAmount: "18000000", ltcTarget: "65% LTC", loanType: "Construction", need: "Builder's risk quote, ALTA survey, Phase I" },
    proj_ironbound: { stage: "Entitlements", units: "72", designStage: "Schematic design", loanAmount: "26000000", ltcTarget: "60% LTC", loanType: "Construction", equityRaise: "6000000", holdPeriod: "5 to 7 years", need: "Use variance and site plan approval" },
    proj_halsey: { stage: "Design", units: "36", scope: "Adaptive reuse of a 1920s warehouse", startDate: "2027-06", designStage: "Design development", equityRaise: "4000000", holdPeriod: "7 to 10 years" },
    proj_broad_townhomes: { stage: "Pre-construction", units: "24", scope: "Townhomes, wood frame", startDate: "2027-04", bidDue: "2027-01-20", loanAmount: "9500000", loanType: "Construction" },
  };
  for (const [id, value] of Object.entries(facts)) {
    await prisma.trackProject.updateMany({ where: { id, roleFacts: "{}" }, data: { roleFacts: JSON.stringify(value) } });
  }
}

/** #42: demo members who cover more than one category. Only fills a blank extraCategories. */
async function ensureMultiCategoryDemo() {
  const combos: Record<string, string> = {
    user_op: "SURETY_BONDING", // Owen Pratt: insurance + surety / bonding
    user_cn: "STRUCTURAL_ENGINEER", // Carla Nunez: civil + structural engineer
    user_dp: "PROPERTY_MANAGER", // Daniel Park: broker + property manager
    user_jw: "RE_ATTORNEY", // Julian Weiss: zoning + real estate attorney
  };
  for (const [id, extraCategories] of Object.entries(combos)) {
    await prisma.user.updateMany({ where: { id, extraCategories: "" }, data: { extraCategories } });
  }
  // Maple Court also seeks the second categories, so the combos show up on Opportunities and Find your team.
  const maple = await prisma.trackProject.findFirst({ where: { name: "Sample: Maple Court Townhomes" }, select: { id: true, seeking: true } });
  if (maple) {
    const have = maple.seeking.split(",").filter(Boolean);
    const want = [...new Set([...have, "SURETY_BONDING", "STRUCTURAL_ENGINEER", "PROPERTY_MANAGER"])];
    if (want.length !== have.length) await prisma.trackProject.update({ where: { id: maple.id }, data: { seeking: want.join(",") } });
  }
}
