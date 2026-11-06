/**
 * Nov 6: category drop-downs in A–Z order of the label the member actually sees (Spanish, German and Japanese sort
 * in their own language; Japanese by reading, so kanji names sit among the katakana ones in あいうえお order).
 * "Other …" catch-alls such as Other Deal Professionals stay at the end.
 */
const LAST = new Set(["OTHER_PROFESSIONAL", "OTHER_DEAL_PROFESSIONALS", "Other Deal Professionals", "OTHER"]);

/** Readings for the Japanese category names that start with kanji. */
export const JA_READING: Record<string, string> = {
  専門工事業者: "せんもんこうじぎょうしゃ",
  不動産仲介業者: "ふどうさんちゅうかいぎょうしゃ",
  不動産弁護士: "ふどうさんべんごし",
  証券弁護士: "しょうけんべんごし",
  建築家: "けんちくか",
  土木エンジニア: "どぼくえんじにあ",
  構造エンジニア: "こうぞうえんじにあ",
  "設備エンジニア（MEP）": "せつびえんじにあ",
  地盤エンジニア: "じばんえんじにあ",
  環境コンサルタント: "かんきょうこんさるたんと",
  測量士: "そくりょうし",
  許認可代行業者: "きょにんかだいこうぎょうしゃ",
  保険会社: "ほけんがいしゃ",
  "保証・ボンド": "ほしょうぼんど",
  鑑定士: "かんていし",
  "会計士・コストセグリゲーション": "かいけいしこすとせぐりげーしょん",
  "資金調達（レンダー・デットファンド、モーゲージブローカー）": "しきんちょうたつ",
  開発パートナー: "かいはつぱーとなー",
  // Nov 6: trades.
  電気工事: "でんきこうじ",
  配管工事: "はいかんこうじ",
  "空調設備（HVAC）": "くうちょうせつび",
  消防設備: "しょうぼうせつび",
  コンクリート工事: "こんくりーとこうじ",
  組積工事: "そせきこうじ",
  鉄骨工事: "てっこつこうじ",
  "躯体・大工工事": "くたいだいくこうじ",
  内装ボード工事: "ないそうぼーどこうじ",
  屋根工事: "やねこうじ",
  "ガラス・サッシ工事": "がらすさっしこうじ",
  床仕上げ工事: "ゆかしあげこうじ",
  塗装工事: "とそうこうじ",
  "外構・掘削工事": "がいこうくっさくこうじ",
  昇降機工事: "しょうこうきこうじ",
  造作工事: "ぞうさくこうじ",
};

export function sortByShownLabel<T>(items: readonly T[], shown: (item: T) => string, locale: string, key?: (item: T) => string): T[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const sortKey = (item: T) => (locale === "ja" ? JA_READING[shown(item)] ?? shown(item) : shown(item));
  const last = (item: T) => (LAST.has(key ? key(item) : "") || LAST.has(shown(item)) ? 1 : 0);
  return [...items].sort((a, b) => last(a) - last(b) || collator.compare(sortKey(a), sortKey(b)));
}
