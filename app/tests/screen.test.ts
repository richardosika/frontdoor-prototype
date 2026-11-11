import { describe, expect, it } from "vitest";
import { emptyPrefillFacts, suggestOne } from "@/lib/guided-prefill";
import { buildReviewSteps, emptyProgress, publicFinding } from "@/lib/review-steps";
import { gradeChecks } from "@/lib/verify/grade";
import { assessEdgarMatch, matchEdgarCompany } from "@/lib/verify/edgar";
import { registryLinkCheck } from "@/lib/verify/checks";
import {
  accessBlocked,
  distinctiveCompanyTokens,
  linkedinBlocked,
  runPublicScreen,
  scorePublicText,
  serpUnusable,
  youtubeTitles,
} from "@/lib/verify/screen";
import type { ApplicantFacts } from "@/lib/verify/types";

const facts = {
  name: "Richard Osika",
  org: "BuildPro Construction Services LLC",
  location: "Saddle Brook, NJ",
};

function applicant(): ApplicantFacts {
  return {
    name: "Richard Osika",
    applicantName: "Richard Osika",
    email: "rich@buildpro-cs.com",
    org: "BuildPro Construction Services LLC",
    location: "Saddle Brook, NJ",
    role: "GENERAL_CONTRACTOR",
    phone: "201-555-0100",
    website: "https://www.buildpro-cs.com",
    linkedinUrl: "https://www.linkedin.com/in/richard-osika",
    socialLinks: "",
    statement: "",
    inviteNote: "",
    testProfile: "",
    cardText: "",
    cardUploaded: false,
    duplicateOfMember: false,
    duplicateOfDeclined: false,
    recentApplications: 0,
    referenceCount: 0,
  };
}

describe("public screening", () => {
  it("matches an SEC company title and does not treat a mentioned word as that firm", () => {
    const rows = [
      { title: "Blackstone Inc.", ticker: "BX", cik: "1393818" },
      { title: "Blackstone Secured Lending Fund", ticker: "BXSL", cik: "1736035" },
      { title: "VEDANTA BIOSCIENCES, INC.", ticker: "", cik: "1677878" },
      { title: "JPMORGAN CHASE & CO", ticker: "JPM", cik: "19617" },
    ];
    expect(matchEdgarCompany(rows, "Blackstone")?.ticker).toBe("BX");
    expect(matchEdgarCompany(rows, "JPMorgan Chase & Co.")?.ticker).toBe("JPM");
    expect(matchEdgarCompany(rows, "BuildPro Construction Services LLC")).toBeNull();
    expect(matchEdgarCompany([...rows, { title: "CAPTIVA VERDE WELLNESS CORP.", ticker: "CPIVF", cik: "1712294" }], "Captiva Development")).toBeNull();
    const judged = assessEdgarMatch({
      org: "Blackstone",
      person: "Stephen A. Schwarzman",
      tickersOk: true,
      companies: rows,
      filingNames: ["Blackstone Inc  (BX)", "SCHWARZMAN STEPHEN A"],
    });
    expect(judged.status).toBe("PASS");
    expect(judged.finding).toContain("Blackstone Inc.");
    expect(judged.finding).toContain("SCHWARZMAN");
    expect(judged.url).toContain("CIK=1393818");
    const missed = assessEdgarMatch({
      org: "Vellixor Hollow Holdings LLC",
      person: "Zorp Qindle",
      tickersOk: true,
      companies: rows,
      filingNames: ["VEDANTA BIOSCIENCES, INC."],
    });
    expect(missed.status).toBe("INCONCLUSIVE");
    expect(missed.finding.toLowerCase()).not.toContain("not found");
    const blocked = assessEdgarMatch({
      org: "Blackstone",
      person: "Stephen A. Schwarzman",
      tickersOk: false,
      companies: [],
      filingNames: [],
    });
    expect(blocked.status).toBe("UNAVAILABLE");
    expect(blocked.finding.toLowerCase()).toContain("could not be checked");
    const dc = registryLinkCheck({ ...applicant(), location: "Washington, DC" });
    expect(dc.url).toContain("os.dc.gov");
    expect(dc.finding).toContain("Couldn't check for free");
  });

  it("does not invent a personal LinkedIn slug when the application has none", async () => {
    const seen: string[] = [];
    await runPublicScreen({ ...applicant(), linkedinUrl: "", website: "https://www.buildpro-cs.com" }, async (url) => {
      seen.push(url);
      if (url.includes("buildpro-cs.com")) return { ok: true, status: 200, text: "BuildPro Construction Services in Saddle Brook" };
      return { ok: false, status: 403, text: "" };
    });
    expect(seen.some((url) => url.includes("/in/"))).toBe(false);
  });

  it("keeps a headline that names the person and the firm, and skips a different person who shares the surname", async () => {
    const schwarzman: ApplicantFacts = {
      ...applicant(),
      name: "Stephen A. Schwarzman",
      applicantName: "Stephen A. Schwarzman",
      org: "Blackstone",
      location: "New York, NY",
      website: "",
      linkedinUrl: "",
    };
    const checks = await runPublicScreen(schwarzman, async (url) => {
      if (!url.includes("news.google.com")) return { ok: false, status: 403, text: "" };
      const query = decodeURIComponent(url);
      const title = query.includes("Schwarzman")
        ? "Blackstone CEO Steve Schwarzman backs a fund - Axios"
        : "Women's Running Pioneer Lynn Blackstone - New York Road Runners";
      return { ok: true, status: 200, text: `<rss><channel><title>News</title><item><title>${title}</title></item></channel></rss>` };
    });
    const news = checks.find((item) => item.key === "screen-news");
    expect(news?.status).toBe("PASS");
    expect(news?.finding).toContain("Steve Schwarzman");
    expect(news?.finding).not.toContain("Lynn Blackstone");
    expect(news?.url).toContain("Schwarzman");
  });

  it("scores a page that names the person and the company, including a short first name", () => {
    const about = "Leadership Richard Osika. Richard Osika leads BuildPro Construction Services and is Principal at Captiva Development.";
    expect(scorePublicText(about, facts)).toMatchObject({ name: true, company: true, confidence: "high" });
    expect(scorePublicText("Persistence and Agility with Rich Osika", facts)).toMatchObject({ name: true, company: false, confidence: "low" });
    expect(scorePublicText("Blackstone CEO Steve Schwarzman backs a fund", { name: "Stephen A. Schwarzman", org: "Blackstone", location: "New York, NY" })).toMatchObject({
      name: true,
      company: true,
      confidence: "high",
    });
    expect(scorePublicText("Related Companies chairman Stephen Ross", { name: "Stephen M. Ross", org: "Related Companies", location: "New York, NY" }).company).toBe(true);
    expect(scorePublicText("The issue is related to rates", { name: "Stephen M. Ross", org: "Related Companies", location: "New York, NY" }).company).toBe(false);
    expect(scorePublicText("Women's Running Pioneer Lynn Blackstone in New York", { name: "Stephen A. Schwarzman", org: "Blackstone", location: "New York, NY" })).toMatchObject({
      name: false,
      company: false,
    });
    expect(scorePublicText("David M. Rubenstein, Co-Founder of The Carlyle Group", { name: "David M. Rubenstein", org: "The Carlyle Group", location: "Washington, DC" })).toMatchObject({
      name: true,
      company: true,
      confidence: "high",
    });
    expect(scorePublicText("Stephen Ross unveils a Related tower", { name: "Stephen M. Ross", org: "Related Companies", location: "New York, NY" }).company).toBe(false);
    expect(scorePublicText("Captiva Island's record home sale", { name: "Richard Osika", org: "Captiva Development", location: "Saddle Brook, NJ" }).company).toBe(false);
    expect(scorePublicText("Richard Osika leads Captiva Development from Saddle Brook", { name: "Richard Osika", org: "Captiva Development", location: "Saddle Brook, NJ" }).company).toBe(true);
    expect(
      scorePublicText("Persistence and Agility with Rich Osika\nBuild Pro Construction Services' core area of business", {
        name: "Richard Osika",
        org: "BuildPro Construction Services LLC",
        location: "Saddle Brook, NJ",
      }),
    ).toMatchObject({ name: true, company: true, confidence: "high" });
    expect(distinctiveCompanyTokens(facts.org)).toEqual(["buildpro"]);
    expect(scorePublicText("Shankara Buildpro shares rose", facts)).toMatchObject({ name: false, company: false, confidence: "none" });
  });

  it("treats a LinkedIn auth wall and a search challenge as blocked, not as a miss", () => {
    expect(linkedinBlocked(999, "")).toBe(true);
    expect(linkedinBlocked(200, "Sign in Join now Authwall")).toBe(true);
    expect(linkedinBlocked(200, "BuildPro Construction Services Saddle Brook, New Jersey Richard Osika")).toBe(false);
    expect(
      linkedinBlocked(200, "Authwall. Sign in to LinkedIn. Ada Chen leads Northwind Robotics in Austin.", {
        name: "Ada Chen",
        org: "Northwind Robotics",
        location: "Austin, TX",
      }),
    ).toBe(false);
    expect(linkedinBlocked(200, "Authwall. Sign in to LinkedIn.", facts)).toBe(true);
    expect(accessBlocked(202, "anomaly challenge", "https://html.duckduckgo.com/")).toBe(true);
    expect(accessBlocked(200, "login", "https://x.com/i/flow/login")).toBe(true);
    expect(serpUnusable(["Poor Richard font family Microsoft"], facts)).toBe(true);
    expect(youtubeTitles('{"title":{"runs":[{"text":"Search filters"}]}}{"title":{"runs":[{"text":"Rich Osika on development"}]}}')).toEqual([
      "Rich Osika on development",
    ]);
  });

  it("records a real page, and does not call a blocked LinkedIn profile a not-found", async () => {
    const about = `<a href="https://www.linkedin.com/company/buildprocs/">LinkedIn</a><a href="https://www.buildpro-cs.com/en/about/">About</a> BuildPro Construction Services Saddle Brook`;
    const aboutPage = "Richard Osika leads BuildPro Construction Services from Saddle Brook.";
    const fetchText = async (url: string) => {
      if (url.includes("/en/about")) return { ok: true, status: 200, text: aboutPage };
      if (url.includes("linkedin.com/in/")) return { ok: false, status: 999, text: "" };
      if (url.includes("linkedin.com/company")) return { ok: true, status: 200, text: "BuildPro Construction Services Saddle Brook, New Jersey" };
      if (url.includes("buildpro-cs.com")) return { ok: true, status: 200, text: about };
      if (url.includes("youtube.com")) return { ok: true, status: 200, text: '{"title":{"runs":[{"text":"Development with Rich Osika"}]}}' };
      if (url.includes("news.google.com")) return { ok: true, status: 200, text: "<rss><channel><title>News</title><item><title>Shankara Buildpro stock</title></item></channel></rss>" };
      return { ok: false, status: 403, text: "captcha" };
    };
    const checks = await runPublicScreen(applicant(), fetchText);
    const linked = checks.find((item) => item.key === "linkedin-fetch");
    const web = checks.find((item) => item.key === "web-footprint");
    const youtube = checks.find((item) => item.key === "screen-youtube");
    const news = checks.find((item) => item.key === "screen-news");
    const x = checks.find((item) => item.key === "screen-x");
    expect(linked?.status).not.toBe("FAIL");
    expect(linked?.finding.toLowerCase()).not.toContain("not found");
    expect(linked?.finding).toContain("blocked automated access");
    expect(linked?.url).toContain("company/buildprocs");
    const site = checks.find((item) => item.key === "website");
    expect(site?.status).toBe("PASS");
    expect(site?.selfReported).toBe(true);
    expect(site?.corroborates).toBe(false);
    expect(site?.url).toContain("/en/about");
    expect(web?.corroborates).toBe(false);
    expect(web?.url || "").not.toContain("/en/about");
    expect(youtube?.finding).toContain("no match found");
    expect(youtube?.finding).toContain("Name: yes");
    expect(youtube?.finding).toContain("Company: no");
    expect(youtube?.finding).toContain("Confidence: low");
    expect(youtube?.finding.toLowerCase()).not.toContain("not found");
    expect(news?.status).toBe("INCONCLUSIVE");
    expect(news?.finding.toLowerCase()).toContain("no match found");
    expect(x?.status).toBe("UNAVAILABLE");
    expect(x?.finding).toContain("Couldn't check for free");
    expect(x?.finding.toLowerCase()).not.toContain("not found");

    const suggestion = suggestOne("identity", emptyPrefillFacts(facts), checks.map((item) => ({
      checkKey: item.key,
      status: item.status,
      finding: item.finding,
      source: item.source,
      url: item.url,
      corroborates: item.corroborates,
    })));
    expect(suggestion.mark).toBe("PASS");
    expect(suggestion.evidenceUrls.join(" ")).toContain("buildpro-cs.com");

    const steps = buildReviewSteps({
      evidence: checks.map((item) => ({ checkKey: item.key, status: item.status, finding: item.finding, source: item.source, url: item.url })),
      saved: emptyProgress(),
      references: [],
      cardOnFile: false,
      facts,
    });
    const identity = steps.find((step) => step.id === "identity");
    expect(identity?.findings.some((item) => item.url.includes("/en/about"))).toBe(true);
    expect(identity?.findings.some((item) => item.source === "LinkedIn" && item.text.toLowerCase().includes("blocked automated access"))).toBe(true);
    expect(identity?.findings.some((item) => item.source === "LinkedIn" && /not found/i.test(item.text))).toBe(false);
    const blockedOnly = await runPublicScreen({ ...applicant(), website: "", linkedinUrl: "https://www.linkedin.com/in/richard-osika" }, async () => ({ ok: false, status: 999, text: "" }));
    const blocked = blockedOnly.find((item) => item.key === "linkedin-fetch");
    expect(blocked?.status).toBe("UNAVAILABLE");
    expect(blocked?.finding).toContain("Couldn't check for free");
    expect(blocked?.finding.toLowerCase()).not.toContain("not found");
    expect(publicFinding("UNAVAILABLE", "LinkedIn blocked automated access. Couldn't check for free.")).not.toMatch(/not found/i);

    const grade = gradeChecks(checks, { applicantName: facts.name, org: facts.org, location: facts.location, website: "https://www.buildpro-cs.com" });
    expect(grade.summary.couldNotCheck).toContain("YouTube: no match found");
    expect(grade.summary.couldNotCheck).toContain("Confidence: low");
    expect(grade.summary.couldNotCheck).not.toContain("YouTube returned a public result");
    expect(grade.summary.couldNotCheck).toContain("Couldn't check for free");
    expect(grade.summary.checkedOut).toContain("A public web page included the person or the company name");
    expect(grade.summary.checkedOut).not.toContain("names both the person and the company");

    const blockedSuggestion = suggestOne(
      "identity",
      emptyPrefillFacts({ ...facts, website: "", linkedinUrl: "https://www.linkedin.com/in/richard-osika" }),
      blockedOnly.map((item) => ({
        checkKey: item.key,
        status: item.status,
        finding: item.finding,
        source: item.source,
        url: item.url,
      })),
    );
    const beforeBlocked = blockedSuggestion.note.split("Blocked sources:")[0] || blockedSuggestion.note;
    expect(beforeBlocked.toLowerCase()).not.toContain("linkedin blocked");
    expect(blockedSuggestion.note).toContain("Couldn't check for free");
  });
});
