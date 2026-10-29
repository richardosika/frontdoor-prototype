import { isMetroCode, isSpecialtySlug, resolveAssetSlug } from "@/lib/platform/catalog";
import { isStateCode } from "@/lib/platform/state-codes";
import { parseAudience, type FieldAudienceChoice } from "@/lib/platform/visibility";
import { defaultStance } from "@/lib/platform/backfill";

const STANCES = new Set(["DEVELOPS", "OPERATES", "SERVES", "INVESTS", "LENDS"]);

export type ProfileFormPlan = {
  homeCity: string;
  homeState: string;
  homeMetro: string;
  nationwide: boolean;
  operateStates: string[];
  operateMetros: string[];
  assets: { slug: string; stance: "DEVELOPS" | "OPERATES" | "SERVES" | "INVESTS" | "LENDS" }[];
  specialties: string[];
  audiences: { lookingFor: FieldAudienceChoice; offering: FieldAudienceChoice; checkSize: FieldAudienceChoice };
};

export function readProfileForm(formData: FormData, role: string): ProfileFormPlan {
  const homeState = String(formData.get("homeState") || "").trim().toUpperCase();
  const homeMetro = String(formData.get("homeMetro") || "").trim();
  const stanceRaw = String(formData.get("stance") || "").trim().toUpperCase();
  const stance = STANCES.has(stanceRaw) ? (stanceRaw as ProfileFormPlan["assets"][number]["stance"]) : defaultStance(role);
  const assets = [...new Set(formData.getAll("asset").map((value) => resolveAssetSlug(String(value))).filter((value): value is string => Boolean(value)))].map(
    (slug) => ({ slug, stance }),
  );
  return {
    homeCity: String(formData.get("homeCity") || "").trim().slice(0, 80),
    homeState: isStateCode(homeState) ? homeState : "",
    homeMetro: isMetroCode(homeMetro) ? homeMetro : "",
    nationwide: formData.get("nationwide") === "on",
    operateStates: [...new Set(formData.getAll("markets").map((value) => String(value).trim().toUpperCase()).filter((value) => isStateCode(value)))],
    operateMetros: [...new Set(formData.getAll("operateMetros").map((value) => String(value).trim()).filter((value) => isMetroCode(value)))],
    assets,
    specialties: [...new Set(formData.getAll("specialty").map((value) => String(value).trim()).filter((value) => isSpecialtySlug(value)))],
    audiences: {
      lookingFor: parseAudience(String(formData.get("audienceLookingFor") || "")),
      offering: parseAudience(String(formData.get("audienceOffering") || "")),
      checkSize: parseAudience(String(formData.get("audienceCheckSize") || "")),
    },
  };
}
