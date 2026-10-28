import { metroForCity } from "@/lib/platform/catalog";
import { stateCodesInText, stateName } from "@/lib/platform/state-codes";

export type BackfillPlan = {
  homeCity: string;
  homeState: string;
  homeMetro: string | null;
  operateStates: string[];
  nationwide: boolean;
};

export function planLocationBackfill(input: { location: string; markets: string }): BackfillPlan {
  const location = input.location.trim();
  const markets = input.markets.trim();
  const city = location.split(",")[0]?.trim().slice(0, 80) ?? "";
  const locationCodes = [...stateCodesInText(location)];
  const marketCodes = [...stateCodesInText(markets)];
  const homeState = locationCodes[0] ?? "";
  const homeMetro = homeState ? metroForCity(city, homeState)?.code ?? null : null;
  const nationwide = /\b(nationwide|national|all states)\b/i.test(`${location} ${markets}`);
  return {
    homeCity: city,
    homeState,
    homeMetro,
    operateStates: marketCodes,
    nationwide,
  };
}

export function homeBaseLabel(input: { homeCity: string; homeState: string; location: string }): string {
  if (input.homeCity && input.homeState) return `${input.homeCity}, ${input.homeState}`;
  if (input.homeState) return stateName(input.homeState);
  return input.location.trim();
}

export function defaultStance(role: string): "DEVELOPS" | "OPERATES" | "SERVES" | "INVESTS" | "LENDS" {
  if (role === "DEVELOPER") return "DEVELOPS";
  if (role === "INVESTOR_PE" || role === "FAMILY_OFFICE") return "INVESTS";
  if (role === "LENDER" || role === "MORTGAGE_BROKER") return "LENDS";
  if (role === "PROPERTY_MANAGER") return "OPERATES";
  return "SERVES";
}
