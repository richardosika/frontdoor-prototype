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
      note: "Marcus Hale personal invites",
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
  await ensureMissingVerificationCases();
  await alignSeedTiers();
  await applySeedCaseMap();
  await ensureDemoAccessAndNotices();
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
