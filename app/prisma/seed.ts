import {
  DealKind,
  MemberRole,
  PrismaClient,
  VerificationTier,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { BRAND } from "../src/lib/brand";

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
    isAdmin: true,
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
    tier: "VERIFIED",
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
    tier: "VERIFIED",
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
    credentialNote: "NJ lender license (fictional) · NMLS lookup matched",
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
    tier: "VERIFIED",
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
    tier: "VERIFIED",
    credentialNote: "NJ broker license active · lookup matched",
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
    tier: "VERIFIED",
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
    tier: "VERIFIED",
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
    tier: "CONFIRMED",
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
    tier: "VERIFIED",
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
    tier: "CONFIRMED",
    credentialNote: "NJ Registered Architect · state board license active",
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
    tier: "VERIFIED",
    credentialNote: "NJ insurance producer license active · surety appointments confirmed",
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
    tier: "VERIFIED",
    credentialNote: "NMLS ID active · NJ mortgage broker license matched",
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
    tier: "VERIFIED",
    credentialNote: "NJ Certified General Appraiser · ASC registry lookup matched",
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
    credentialNote: "Entity records checked · owner references pending",
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
    tier: "VERIFIED",
    credentialNote: "NJ and NY CPA licenses active · cost seg practice reviewed",
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
    tier: "VERIFIED",
    credentialNote: "Qualified intermediary entity checked · fidelity bond and E&O on file",
    bio: "1031 intermediary. Fictional.",
  },
];

async function main() {
  const reset = process.env.SEED === "reset";
  const members = await prisma.user.count();
  if (!reset && members > 0) {
    console.log("Database already has members. Skipping seed. Set SEED=reset to wipe and reseed.");
    return;
  }
  if (reset) {
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
    await prisma.inviteCode.deleteMany();
    await prisma.user.deleteMany();
  }

  for (const person of people) {
    await prisma.user.create({
      data: { ...person, passwordHash, isAdmin: Boolean(person.isAdmin), status: "ACTIVE" },
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
      credentialValue: "NJ architect license no. 21AI001234 (fictional)",
      referenceEmails: ["marcus.hale@halerow.example", "grace.liu@liustudio.example"],
      statement: `I design ground-up multifamily and would like to meet GCs already in the ${BRAND.club}.`,
      statusToken: "demo-jordan-ellis-status",
      status: "PENDING",
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
      hours: 96,
    },
    {
      id: "deal_brarch",
      sponsorId: "user_dw",
      kind: "SEEKING",
      title: "Design team for 64-unit conversion, Brooklyn NY",
      blurb: "Seeking a NY-licensed architect and structural engineer. State license required.",
      market: "NY",
      sizeBand: "scope",
      assetClass: "Multifamily",
      raiseLabel: "64 units",
      roleNeeded: "ARCHITECT_ENGINEER",
      deadline: "RFP Dec 1",
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
      hours: 48,
    },
    {
      id: "deal_edlend",
      sponsorId: "user_pa",
      kind: "SEEKING",
      title: "Construction loan for storage expansion, Edison NJ",
      blurb: "Seeking a licensed lender for a construction facility on a fourth storage building.",
      market: "NJ",
      sizeBand: "1-5",
      assetClass: "Storage",
      raiseLabel: "$3.2M",
      roleNeeded: "LENDER",
      deadline: "Term sheets Nov 30",
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
        body: data.blurb,
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

  console.log(`Seeded ${BRAND.name} demo data. Password for every member: cornicio-demo`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
