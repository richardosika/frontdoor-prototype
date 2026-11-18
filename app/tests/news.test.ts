import { describe, expect, it } from "vitest";
import { scoreReport } from "@/lib/verify/score";
import type { ApplicantFacts } from "@/lib/verify/types";
import {
  bingNewsUrl,
  allegedNegative,
  classifyNews,
  dedupeNewsItems,
  feedBodyState,
  newsStoryChipLabel,
  gdeltNewsUrl,
  gdeltQuery,
  googleNewsUrl,
  newsChecks,
  newsSearchQueries,
  parseGdeltArticles,
  parseRssItems,
  withinNewsWindow,
} from "@/lib/verify/news";

const NOW = new Date("2026-10-25T16:00:00.000Z");

function facts(overrides: Partial<ApplicantFacts> = {}): ApplicantFacts {
  return {
    name: "Stephen Ross",
    applicantName: "Stephen Ross",
    email: "stephen.ross.probe@example.com",
    org: "Related Companies",
    location: "New York, NY",
    role: "DEVELOPER",
    phone: "",
    website: "https://www.related.com",
    linkedinUrl: "",
    socialLinks: "",
    statement: "",
    inviteNote: "",
    testProfile: "",
    cardText: "",
    cardUploaded: false,
    duplicateOfMember: false,
    duplicateOfDeclined: false,
    recentApplications: 0,
    ...overrides,
  };
}

function item(partial: { title: string; description?: string; link?: string; date?: string; source?: string }): string {
  return `<item><title>${partial.title}</title><link>${partial.link || "https://example.com/story"}</link><pubDate>${partial.date || "Sat, 18 Jul 2026 07:00:00 GMT"}</pubDate><description>${partial.description || partial.title}</description>${partial.source ? `<source url="https://example.com">${partial.source}</source>` : ""}</item>`;
}

function rss(body: string): string {
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>news</title>${body}</channel></rss>`;
}

describe("news feeds", () => {
  it("builds quoted person, company, and company-plus-city queries", () => {
    const applicant = facts();
    expect(newsSearchQueries(applicant)).toEqual([
      `"Stephen Ross" "related companies"`,
      `"Ross" "related companies"`,
      `"Related Companies" "New York"`,
    ]);
    expect(googleNewsUrl(newsSearchQueries(applicant)[0])).toContain("https://news.google.com/rss/search?q=");
    expect(googleNewsUrl(newsSearchQueries(applicant)[0])).toContain("when%3A5y");
    expect(bingNewsUrl(newsSearchQueries(applicant)[0])).toContain("https://www.bing.com/news/search?q=");
    expect(bingNewsUrl(newsSearchQueries(applicant)[0])).toContain("format=rss");
    expect(gdeltQuery(applicant)).toContain(`"Stephen Ross"`);
    expect(gdeltQuery(applicant)).toContain(`"Related Companies" "New York"`);
    const gdelt = gdeltNewsUrl(gdeltQuery(applicant), NOW);
    expect(gdelt).toContain("api.gdeltproject.org");
    expect(gdelt).toContain("startdatetime=20211025");
  });

  it("parses a Google item and unwraps a Bing click link", () => {
    const google = parseRssItems(
      rss(
        item({
          title: "Billionaire Stephen Ross Unveils a Plan - Realtor.com",
          source: "Realtor.com",
          description: "&lt;a href=&quot;https://news.google.com/rss/articles/abc&quot;&gt;Stephen Ross leads Related Companies&lt;/a&gt;",
        }),
      ),
      "Google News",
    );
    expect(google).toHaveLength(1);
    expect(google[0].title).toBe("Billionaire Stephen Ross Unveils a Plan");
    expect(google[0].source).toBe("Realtor.com");
    expect(google[0].snippet).toContain("Stephen Ross leads Related Companies");
    expect(google[0].snippet).not.toContain("<a");
    expect(google[0].publishedAt).toBe("2026-07-18T07:00:00.000Z");

    const bing = parseRssItems(
      rss(
        `<item><title>Stephen Ross expanding in Boca Raton</title><link>http://www.bing.com/news/apiclick.aspx?url=https%3a%2f%2fwww.example.com%2fross&amp;c=1</link><pubDate>Mon, 01 Jun 2026 12:00:00 GMT</pubDate><description>Stephen Ross and Related Companies.</description></item>`,
      ),
      "Bing News",
    );
    expect(bing[0].url).toBe("https://www.example.com/ross");
  });

  it("drops items older than five years and keeps an undated item", () => {
    expect(withinNewsWindow("2019-01-01T00:00:00.000Z", NOW)).toBe(false);
    expect(withinNewsWindow("2024-01-01T00:00:00.000Z", NOW)).toBe(true);
    expect(withinNewsWindow(null, NOW)).toBe(true);
  });

  it("does not treat a query echo or a url-only name as coverage", () => {
    const query = newsSearchQueries(facts())[0];
    const checks = classifyNews(
      facts(),
      [
        {
          title: query,
          snippet: query,
          url: "https://example.com/echo",
          source: "Echo",
          publishedAt: "2026-07-18T07:00:00.000Z",
          provider: "Google News",
        },
        {
          title: "Development roundup",
          snippet: "A list of projects.",
          url: "https://example.com/stephen-ross-related-companies",
          source: "Roundup",
          publishedAt: "2026-07-18T07:00:00.000Z",
          provider: "Google News",
        },
      ],
      [{ name: "Google News", state: "responded" }, { name: "Bing News", state: "responded" }, { name: "GDELT", state: "responded" }],
      NOW,
    );
    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe("INCONCLUSIVE");
    expect(checks[0].finding).toContain("No data found");
  });

  it("keeps an ambiguous common-name hit as possible match, not a failure", () => {
    const checks = classifyNews(
      facts({ name: "John Smith", applicantName: "John Smith", org: "Acme Realty", location: "Newark, NJ" }),
      [
        {
          title: "John Smith sued over a fence",
          snippet: "John Smith sued a neighbor. A client paid the bill.",
          url: "https://example.com/smith",
          source: "Town Crier",
          publishedAt: "2026-06-02T15:00:00.000Z",
          provider: "Google News",
        },
      ],
      [{ name: "Google News", state: "responded" }, { name: "Bing News", state: "responded" }, { name: "GDELT", state: "responded" }],
      NOW,
    );
    expect(checks[0].status).toBe("INCONCLUSIVE");
    expect(checks[0].status).not.toBe("FAIL");
    expect(checks[0].reviewFlag).toBe(true);
    expect(checks[0].finding).toContain("Possible match, needs review");
    expect(checks[0].finding).toContain("not a failure");
    expect(checks.every((check) => check.status !== "FAIL")).toBe(true);
    expect(checks[1].finding).toContain("Possible match, review");
    expect(checks[1].finding).toContain("2026-06-02");
    expect(checks[1].source).toContain("Town Crier");
    expect(checks[1].url).toBe("https://example.com/smith");
    expect(scoreReport(checks).verdict).not.toBe("NOT_LEGIT");
  });

  it("fails a negative headline that also names the company, and links it", () => {
    const checks = classifyNews(
      facts(),
      [
        {
          title: "SEC charges Stephen Ross and Related Companies",
          snippet: "The SEC charges were filed in New York.",
          url: "https://example.com/charges",
          source: "Court Desk",
          publishedAt: "2026-03-04T15:00:00.000Z",
          provider: "Bing News",
        },
        {
          title: "Stephen Ross leads Related Companies",
          snippet: "A profile of the firm.",
          url: "https://example.com/profile",
          source: "Profile",
          publishedAt: "2026-08-01T15:00:00.000Z",
          provider: "Google News",
        },
      ],
      [{ name: "Google News", state: "responded" }, { name: "Bing News", state: "responded" }, { name: "GDELT", state: "responded" }],
      NOW,
    );
    expect(checks[0].status).toBe("FAIL");
    expect(checks[0].reviewFlag).toBe(true);
    expect(checks[0].hardFlag).toBeUndefined();
    expect(checks[0].finding).toContain("not an automatic decline");
    const negative = checks.find((check) => check.key === "news-story" && check.url === "https://example.com/charges");
    expect(negative?.key).toBe("news-story");
    expect(negative?.status).toBe("FAIL");
    expect(negative?.finding).toContain("Negative");
    expect(negative?.finding).toContain("2026-03-04");
    expect(negative?.source).toBe("Court Desk via Bing News");
    expect(scoreReport(checks).verdict).toBe("NEEDS_OWNER_DECISION");
  });

  it("does not treat a comment about bankruptcies as an allegation", () => {
    const headline = "Blackstone's Schwarzman plays down private credit concerns over bankruptcies";
    expect(allegedNegative(headline)).toBe(false);
    expect(allegedNegative("SEC charges Stephen Ross and Related Companies")).toBe(true);
    const checks = classifyNews(
      facts({ name: "Stephen A. Schwarzman", applicantName: "Stephen A. Schwarzman", org: "Blackstone" }),
      [
        {
          title: headline,
          snippet: "Stephen Schwarzman discussed private credit.",
          url: "https://example.com/credit",
          source: "Market Desk",
          publishedAt: "2025-12-09T15:00:00.000Z",
          provider: "Google News",
        },
      ],
      [{ name: "Google News", state: "responded" }, { name: "Bing News", state: "responded" }, { name: "GDELT", state: "responded" }],
      NOW,
    );
    expect(checks[0].status).toBe("PASS");
    expect(checks[0].status).not.toBe("FAIL");
  });

  it("passes neutral coverage that names the person and the company", () => {
    const checks = classifyNews(
      facts(),
      [
        {
          title: "Stephen Ross leads Related Companies in New York",
          snippet: "The firm opened a new building.",
          url: "https://example.com/leads",
          source: "City Desk",
          publishedAt: "2026-07-18T07:00:00.000Z",
          provider: "Google News",
        },
        {
          title: "Unrelated landlord indicted",
          snippet: "A different person was indicted.",
          url: "https://example.com/other",
          source: "Other",
          publishedAt: "2026-07-01T07:00:00.000Z",
          provider: "GDELT",
        },
      ],
      [{ name: "Google News", state: "responded" }, { name: "Bing News", state: "unavailable" }, { name: "GDELT", state: "responded" }],
      NOW,
    );
    expect(checks[0].status).toBe("PASS");
    expect(checks[0].corroborates).toBe(true);
    expect(checks[0].finding).toContain("Unavailable: Bing News.");
    expect(checks.some((check) => check.url === "https://example.com/other")).toBe(false);
    const summary = scoreReport(checks).summary;
    expect(summary).toContain("What I could not check for free");
    expect(summary).toContain("Bing News");
  });

  it("lists every blocked feed under what could not be checked", () => {
    const checks = classifyNews(
      facts(),
      [],
      [
        { name: "Google News", state: "unavailable" },
        { name: "Bing News", state: "unavailable" },
        { name: "GDELT", state: "unavailable" },
      ],
      NOW,
    );
    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe("UNAVAILABLE");
    expect(checks[0].finding).toContain("could not be checked");
    expect(checks[0].finding).toContain("Unavailable: Google News, Bing News, GDELT.");
    const summary = scoreReport(checks).summary;
    expect(summary).toContain("What I could not check for free");
    expect(summary).toContain("Google News");
    expect(summary).toContain("Bing News");
    expect(summary).toContain("GDELT");
    expect(summary).not.toContain("none of the free sources were blocked");
  });

  it("treats a lien as negative and ignores the word client", () => {
    const lien = classifyNews(
      facts({ name: "John Smith", applicantName: "John Smith", org: "Acme Realty", location: "Austin, TX" }),
      [
        {
          title: "A lien names John Smith at Acme Realty",
          snippet: "The lien was recorded last week.",
          url: "https://example.com/lien",
          source: "Recorder",
          publishedAt: "2026-04-04T12:00:00.000Z",
          provider: "Google News",
        },
      ],
      [{ name: "Google News", state: "responded" }, { name: "Bing News", state: "responded" }, { name: "GDELT", state: "responded" }],
      NOW,
    );
    expect(lien[0].status).toBe("FAIL");
    expect(lien[0].reviewFlag).toBe(true);
    expect(lien[0].finding).toContain("A civil headline names this person");

    const client = classifyNews(
      facts({ name: "John Smith", applicantName: "John Smith", org: "Acme Realty", location: "Austin, TX" }),
      [
        {
          title: "John Smith meets an Acme Realty client",
          snippet: "The client toured a building.",
          url: "https://example.com/client",
          source: "Desk",
          publishedAt: "2026-04-04T12:00:00.000Z",
          provider: "Google News",
        },
      ],
      [{ name: "Google News", state: "responded" }, { name: "Bing News", state: "responded" }, { name: "GDELT", state: "responded" }],
      NOW,
    );
    expect(client[0].status).toBe("PASS");
  });

  it("marks a city match as corroborated and a name-only lawsuit as review", () => {
    const city = classifyNews(
      facts({ name: "John Smith", applicantName: "John Smith", org: "Acme Realty", location: "Newark, NJ" }),
      [
        {
          title: "John Smith sued in Newark",
          snippet: "The filing does not name an employer.",
          url: "https://example.com/newark",
          source: "Local",
          publishedAt: "2026-05-05T12:00:00.000Z",
          provider: "GDELT",
        },
      ],
      [{ name: "Google News", state: "responded" }, { name: "Bing News", state: "responded" }, { name: "GDELT", state: "responded" }],
      NOW,
    );
    expect(city[0].status).toBe("FAIL");
    expect(city[0].reviewFlag).toBe(true);
    expect(city[0].finding).toContain("A civil headline names this person");
    expect(city[0].finding).not.toContain("Company-level litigation");
    expect(city[1].status).toBe("FAIL");
    expect(city[1].finding).toContain("Civil, names applicant");
  });

  it("asks Google, Bing, and GDELT and records which feeds were blocked", async () => {
    const neutral = rss(
      item({
        title: "Stephen Ross leads Related Companies",
        source: "City Desk",
        description: "Stephen Ross leads Related Companies in New York.",
      }),
    );
    const seen: string[] = [];
    const checks = await newsChecks(
      facts(),
      async (url) => {
        seen.push(url);
        if (url.includes("news.google.com")) return { ok: true, status: 200, text: neutral };
        if (url.includes("bing.com")) return { ok: false, status: 403, text: "" };
        return { ok: false, status: 429, text: "Please limit requests" };
      },
      NOW,
    );
    expect(seen.some((url) => url.includes("news.google.com/rss/search"))).toBe(true);
    expect(seen.some((url) => url.includes("Related%20Companies%22%20%22New%20York") || url.includes("New%20York"))).toBe(true);
    expect(seen.some((url) => url.includes("bing.com/news/search") && url.includes("format=rss"))).toBe(true);
    expect(seen.filter((url) => url.includes("gdeltproject.org"))).toHaveLength(1);
    expect(checks[0].status).toBe("PASS");
    expect(checks[0].finding).toContain("Google News responded");
    expect(checks[0].finding).toContain("Unavailable: Bing News, GDELT.");
    expect(checks[1].key).toBe("news-story");
    expect(checks[1].url).toBe("https://example.com/story");
  });

  it("shows a second feed when one feed has more headlines", () => {
    const google = [1, 2, 3, 4, 5, 6].map((day) => ({
      title: `Stephen Ross speaks on day ${day}`,
      snippet: "Stephen Ross speaks.",
      url: `https://example.com/g${day}`,
      source: "Paper",
      publishedAt: `2026-07-${String(day).padStart(2, "0")}T00:00:00.000Z`,
      provider: "Google News",
    }));
    const bing = [1, 2].map((day) => ({
      title: `Stephen Ross visits site ${day}`,
      snippet: "Stephen Ross visits.",
      url: `https://example.com/b${day}`,
      source: "Wire",
      publishedAt: `2026-06-0${day}T00:00:00.000Z`,
      provider: "Bing News",
    }));
    const checks = classifyNews(
      facts(),
      [...google, ...bing],
      [
        { name: "Google News", state: "responded" },
        { name: "Bing News", state: "responded" },
        { name: "GDELT", state: "responded" },
      ],
      NOW,
    );
    const stories = checks.filter((check) => check.key === "news-story");
    expect(stories.filter((check) => check.source.includes("Bing News"))).toHaveLength(2);
    expect(stories.length).toBeLessThanOrEqual(8);
  });

  it("labels a matched headline instead of no data", () => {
    expect(newsStoryChipLabel("news-story", "INCONCLUSIVE", "Neutral · 2026-07-18 · Stephen Ross speaks")).toBe("Headline");
    expect(newsStoryChipLabel("news-story", "INCONCLUSIVE", "Possible match, review · 2026-06-02 · John Smith sued")).toBe("Review");
    expect(newsStoryChipLabel("news", "INCONCLUSIVE", "No data found.")).toBeNull();
    expect(newsStoryChipLabel("news-story", "FAIL", "Negative · 2026-03-04 · SEC charges")).toBeNull();
  });

  it("parses GDELT articles and treats an empty feed as no data", () => {
    const articles = parseGdeltArticles(
      JSON.stringify({
        articles: [{ title: "Stephen Ross and Related Companies open a tower", url: "https://example.com/tower", seendate: "20260718T120000Z", domain: "example.com" }],
      }),
    );
    expect(articles[0].publishedAt).toBe("2026-07-18T12:00:00.000Z");
    expect(articles[0].provider).toBe("GDELT");
    expect(feedBodyState(200, rss(""), "rss")).toBe("no-data");
    expect(feedBodyState(200, "<html>consent</html>", "rss")).toBe("unavailable");
    expect(feedBodyState(429, "", "json")).toBe("unavailable");
    expect(feedBodyState(200, JSON.stringify({ articles: [] }), "json")).toBe("no-data");
  });

  it("ignores a place-name collision and separates a lawsuit from fraud", () => {
    const providers = [
      { name: "Google News", state: "responded" as const },
      { name: "Bing News", state: "responded" as const },
      { name: "GDELT", state: "responded" as const },
    ];
    const place = classifyNews(
      facts({ name: "Ada Quinn", applicantName: "Ada Quinn", org: "Bristol Development", location: "New York, NY" }),
      [
        {
          title: "Bristol council meets on Tuesday",
          snippet: "The council agenda was routine.",
          url: "https://example.com/council",
          source: "Local",
          publishedAt: "2026-05-01T12:00:00.000Z",
          provider: "Google News",
        },
      ],
      providers,
      NOW,
    );
    expect(place[0].corroborates).not.toBe(true);
    expect(place[0].finding).not.toContain("names this person and company");
    expect(place.some((check) => check.key === "news-story")).toBe(false);

    const sole = classifyNews(
      facts({ name: "Ada Quinn", applicantName: "Ada Quinn", org: "Bristol", location: "New York, NY" }),
      [
        {
          title: "Bristol council meets Ada Quinn",
          snippet: "A local meeting.",
          url: "https://example.com/meet",
          source: "Local",
          publishedAt: "2026-05-01T12:00:00.000Z",
          provider: "Google News",
        },
      ],
      providers,
      NOW,
    );
    expect(sole[0].corroborates).not.toBe(true);

    const lawsuit = classifyNews(
      facts({ name: "Ada Quinn", applicantName: "Ada Quinn", org: "Bristol Development", location: "New York, NY" }),
      [
        {
          title: "Bristol Development sued over a lease",
          snippet: "The filing names the company only.",
          url: "https://example.com/suit",
          source: "Desk",
          publishedAt: "2026-05-02T12:00:00.000Z",
          provider: "Google News",
        },
      ],
      providers,
      NOW,
    );
    expect(lawsuit[0].status).toBe("INCONCLUSIVE");
    expect(lawsuit[0].reviewFlag).toBeUndefined();
    expect(lawsuit[0].finding).toContain("Company-level litigation");

    const fraud = classifyNews(
      facts({ name: "Ada Quinn", applicantName: "Ada Quinn", org: "Bristol Development", location: "New York, NY" }),
      [
        {
          title: "Ada Quinn of Bristol Development indicted for fraud",
          snippet: "Prosecutors described the charge.",
          url: "https://example.com/fraud",
          source: "Desk",
          publishedAt: "2026-05-03T12:00:00.000Z",
          provider: "Google News",
        },
      ],
      providers,
      NOW,
    );
    expect(fraud[0].status).toBe("FAIL");
    expect(fraud[0].reviewFlag).toBe(true);
    expect(fraud[0].finding).toContain("not an automatic decline");
  });

  it("does not match turner inside a hyphenated word, and keeps one copy of a repeated headline", () => {
    const applicant = facts({
      name: "QA Tester",
      applicantName: "QA Tester",
      org: "Turner Construction Company",
    });
    const headline = "A page-turner for every e-reader tester";
    const checks = classifyNews(
      applicant,
      [
        {
          title: headline,
          snippet: "The e-reader tester loved the page-turner.",
          url: "https://example.com/turner-1",
          source: "Desk",
          publishedAt: "2026-07-18T07:00:00.000Z",
          provider: "Google News",
        },
        {
          title: headline,
          snippet: "The e-reader tester loved the page-turner.",
          url: "https://example.com/turner-2",
          source: "Wire",
          publishedAt: "2026-07-18T07:00:00.000Z",
          provider: "Bing News",
        },
        {
          title: "Turner Construction Company starts a New York tower",
          snippet: "Turner Construction Company published the notice.",
          url: "https://example.com/turner-real",
          source: "Desk",
          publishedAt: "2026-07-18T07:00:00.000Z",
          provider: "Google News",
        },
      ],
      [
        { name: "Google News", state: "responded" },
        { name: "Bing News", state: "responded" },
      ],
      NOW,
    );
    const stories = checks.filter((check) => check.key === "news-story");
    expect(stories.some((check) => /page-turner/i.test(check.finding))).toBe(false);
    expect(stories.filter((check) => /Turner Construction Company starts/i.test(check.finding))).toHaveLength(1);
    expect(dedupeNewsItems([
      { title: headline, url: "https://example.com/a" },
      { title: headline, url: "https://example.com/b" },
    ])).toHaveLength(1);
  });
});
