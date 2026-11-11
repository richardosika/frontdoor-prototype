import { freeRegistryState } from "@/lib/approval-warning";
import { statedUsState } from "@/lib/verify/address";

/** Official secretary-of-state or corporation search page for each US state and DC. */
export const STATE_REGISTRY_SEARCH: Record<string, string> = {
  AL: "https://arc-sos.state.al.us/CGI/CORPNAME.MBR/INPUT",
  AK: "https://www.commerce.alaska.gov/cbp/main/search/entities",
  AZ: "https://ecorp.azcc.gov/EntitySearch/Index",
  AR: "https://www.sos.arkansas.gov/corps/search_corps.php",
  CA: "https://bizfileonline.sos.ca.gov/search/business",
  CO: "https://www.sos.state.co.us/biz/BusinessEntityCriteriaExt.do",
  CT: "https://service.ct.gov/business/s/onlinebusinesssearch",
  DE: "https://icis.corp.delaware.gov/Ecorp/EntitySearch/NameSearch.aspx",
  DC: "https://os.dc.gov/service/corporate-registration-search",
  FL: "https://search.sunbiz.org/Inquiry/CorporationSearch/ByName",
  GA: "https://ecorp.sos.ga.gov/BusinessSearch",
  HI: "https://hbe.ehawaii.gov/documents/search.html",
  ID: "https://sosbiz.idaho.gov/search/business",
  IL: "https://www.ilsos.gov/departments/business_services/corp.html",
  IN: "https://bsd.sos.in.gov/publicbusinesssearch",
  IA: "https://sos.iowa.gov/search/business/search.aspx",
  KS: "https://www.sos.ks.gov/eforms/BusinessEntity/Search.aspx",
  KY: "https://web.sos.ky.gov/ftsearch/",
  LA: "https://coraweb.sos.la.gov/commercialsearch/commercialsearch.aspx",
  ME: "https://icrs.informe.org/nei-sos-icrs/ICRS?MainPage=x",
  MD: "https://egov.maryland.gov/businessexpress/entitysearch",
  MA: "https://corp.sec.state.ma.us/corpweb/CorpSearch/CorpSearch.aspx",
  MI: "https://mibusinessregistry.lara.state.mi.us/search/business",
  MN: "https://mblsportal.sos.state.mn.us/Business/Search",
  MS: "https://corp.sos.ms.gov/corp/portal/c/page/corpBusinessIdSearch/portal.aspx",
  MO: "https://bsd.sos.mo.gov/BusinessEntity/BESearch.aspx?SearchType=0",
  MT: "https://biz.sosmt.gov/search/business",
  NE: "https://www.nebraska.gov/sos/corp/corpsearch.cgi?nav=search",
  NV: "https://esos.nv.gov/EntitySearch/OnlineEntitySearch",
  NH: "https://quickstart.sos.nh.gov/online/BusinessInquire",
  NJ: "https://www.njportal.com/DOR/BusinessNameSearch/",
  NM: "https://portal.sos.state.nm.us/BFS/online/CorporationBusinessSearch",
  NY: "https://apps.dos.ny.gov/publicInquiry/",
  NC: "https://www.sosnc.gov/online_services/search/by_title/_Business_Registration",
  ND: "https://firststop.sos.nd.gov/search/business",
  OH: "https://businesssearch.ohiosos.gov/",
  OK: "https://www.sos.ok.gov/corp/corpInquiryFind.aspx",
  OR: "https://sos.oregon.gov/business/Pages/find.aspx",
  PA: "https://www.corporations.pa.gov/search/corpsearch",
  RI: "https://business.sos.ri.gov/CorpWeb/CorpSearch/CorpSearch.aspx",
  SC: "https://businessfilings.sc.gov/BusinessFiling/Entity/Search",
  SD: "https://sosenterprise.sd.gov/BusinessServices/Business/FilingSearch.aspx",
  TN: "https://sos.tn.gov/business-services/business-search",
  TX: "https://mycpa.cpa.state.tx.us/coa/",
  UT: "https://businessregistration.utah.gov/EntitySearch/OnlineEntitySearch",
  VT: "https://bizfilings.vermont.gov/online/BusinessInquire",
  VA: "https://cis.scc.virginia.gov/",
  WA: "https://ccfs.sos.wa.gov/",
  WV: "https://apps.sos.wv.gov/business/corporations/",
  WI: "https://www.wdfi.org/apps/CorpSearch/Search.aspx",
  WY: "https://wyobiz.wyo.gov/Business/FilingSearch.aspx",
};

const OLD_REGISTRY_NOTE =
  /(?:Couldn['’]t check for free\.\s*)?No stable free registry API for this state\.\s*Search the secretary of state manually\./i;

export function stateRegistrySearchUrl(state: string): string {
  return STATE_REGISTRY_SEARCH[state.toUpperCase()] || "";
}

/** The sentence already shown for Arizona. Every other state uses the same shape. */
export function manualRegistryFinding(state: string, org: string): string {
  const name = org.trim();
  const lookup = name ? ` and look up ${name}` : "";
  return `Couldn't check for free. No free ${state} registry API. Open the state search${lookup}.`;
}

/**
 * Stored checks for states that had no link still say to search manually, with no URL.
 * Show the state note and the state search link without rewriting the saved row.
 */
export function shownRegistryCheck(input: { finding: string; url: string; location: string; org?: string }): { finding: string; url: string } {
  if (!OLD_REGISTRY_NOTE.test(input.finding)) return { finding: input.finding, url: input.url };
  const state = freeRegistryState(input.location) || statedUsState(input.location || "");
  if (!state) return { finding: input.finding, url: input.url };
  const url = input.url || stateRegistrySearchUrl(state);
  const sentence = manualRegistryFinding(state, input.org || "");
  return { finding: input.finding.replace(OLD_REGISTRY_NOTE, sentence), url };
}
