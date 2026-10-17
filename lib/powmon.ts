export type PowmonId = "ally-001" | "enemy-001" | "enemy-overdrive" | "raihin" | "rigan" | "rigin" | "raimon" | "heruberos" | "ninja" | "rising-dragon" | "vampire" | "sky-angel";
export type CardType = "monster" | "super" | "rare";
export type ItemId = "sword" | "glasses" | "muffler";
const ROOT = "https://raw.githubusercontent.com/mky1729/power-monster/main/public";
export const CARD_IMAGE_ROOT = `${ROOT}/cards`;
export const cardNames: Record<CardType, string> = { monster: "モンスターカード", super: "スーパーカード", rare: "レアカード" };
export type Powmon = { id: PowmonId; name: string; image: string; evolvedImage?: string; evolvedName?: string; cards?: Partial<Record<CardType, string>>; evolvedCards?: Partial<Record<CardType, string>>; note: string; boss?: boolean };
const art = (name: string) => `${ROOT}/forest/${name}.jpg`;
const card = (name: string) => `${CARD_IMAGE_ROOT}/${name}.jpg`;
export const powmons: Powmon[] = [
  { id: "ally-001", name: "ライデン", image: `${ROOT}/powermon/ally-001.jpeg`, evolvedImage: `${ROOT}/powermon/ally-002.jpeg`, evolvedName: "ライホウ", cards: { monster: card("monster_card_raiden"), super: card("super_card_raiden") }, evolvedCards: { monster: card("monster_card_raihou") }, note: "研究施設で出会った相棒" },
  { id: "enemy-001", name: "ホウワン", image: `${ROOT}/powermon/enemy-001.png`, evolvedImage: `${ROOT}/powermon/enemy-002.jpeg`, evolvedName: "デルベロス", cards: { monster: card("monster_card_houwan"), super: card("super_card_houwan") }, evolvedCards: { monster: card("monster_card_deruberos"), super: card("super_card_deruberos") }, note: "消失街区のパワモン" },
  { id: "enemy-overdrive", name: "OVERDRIVE個体", image: `${ROOT}/powermon/enemy-002.jpeg`, cards: { monster: card("monster_card_deruberos"), super: card("super_card_deruberos") }, note: "夢界深層のパワモン", boss: true },
  { id: "raihin", name: "ライヒン", image: art("raihin"), cards: { monster: card("monster_card_raihin"), rare: card("rare_card_raihin") }, note: "木漏れ日の草むらにすむ" },
  { id: "rigan", name: "ライガン・ドラゴン", image: art("raigan_dragon"), cards: { monster: card("monster_card_rigan"), rare: card("rare_card_rigan") }, note: "雷の古木を守るドラゴン" },
  { id: "rigin", name: "リギン", image: card("monster_card_rigin"), cards: { monster: card("monster_card_rigin") }, note: "草むらにかくれる小さな影" },
  { id: "raimon", name: "ライモン", image: card("monster_card_raimon"), cards: { monster: card("monster_card_raimon"), rare: art("raimon_rare") }, note: "光る泉に集まるパワモン" },
  { id: "heruberos", name: "ヘルベロス", image: card("monster_card_heruberos"), cards: { monster: card("monster_card_heruberos"), rare: art("heruberos_rare") }, note: "森の泉の番人", boss: true },
  { id: "ninja", name: "忍者の武人", image: art("ninjanobujin"), evolvedImage: art("ninjanobujin_densetsunoken"), evolvedName: "忍者の武人・伝説の剣", note: "竹林を修行の場にしている" },
  { id: "rising-dragon", name: "ライジングドラゴン", image: art("rising_dragon"), cards: { rare: card("rare_card_rising_dragon") }, note: "古木の上空を舞う竜", boss: true },
  { id: "vampire", name: "ブラッドデーモン・ヴァンパイア", image: art("blood_demon_vanpire"), note: "木陰の洞穴にひそむ", boss: true },
  { id: "sky-angel", name: "スカイエンジェル", image: art("sky_angel"), note: "空の見える丘に降り立つ" },
];
export function getPowmon(id: PowmonId): Powmon { return powmons.find((p) => p.id === id)!; }
export function powmonName(id: PowmonId, evolved = false) { const p = getPowmon(id); return evolved ? p.evolvedName ?? p.name : p.name; }
export function powmonImage(id: PowmonId, evolved = false) { const p = getPowmon(id); return evolved ? p.evolvedImage ?? p.image : p.image; }
export function captureChance(card: CardType, boss: boolean) { return boss ? ({ monster: 0.45, super: 0.75, rare: 0.92 }[card]) : ({ monster: 0.7, super: 0.9, rare: 0.98 }[card]); }
export function cardImageFor(id: PowmonId, type: CardType, evolved = false) { const p = getPowmon(id); return (evolved ? p.evolvedCards : p.cards)?.[type]; }
export const forestTrees = [ [2, 1], [3, 1], [6, 1], [2, 3], [5, 3], [8, 3], [2, 5], [5, 5], [8, 5] ];
export const forestSpots: Array<{ x: number; y: number; label: string; pool: PowmonId[] }> = [
  { x: 3, y: 2, label: "草むら", pool: ["raihin", "rigin"] },
  { x: 7, y: 1, label: "雷の古木", pool: ["rigan", "rising-dragon"] },
  { x: 7, y: 4, label: "光る泉", pool: ["raimon", "heruberos"] },
  { x: 4, y: 4, label: "竹林", pool: ["ninja"] },
  { x: 8, y: 6, label: "木陰の洞穴", pool: ["vampire"] },
  { x: 5, y: 1, label: "空見の丘", pool: ["sky-angel"] },
];
export const forestItems: Array<{ id: ItemId; name: string; x: number; y: number; image: string; effect: string }> = [
 { id: "sword", name: "伝説の剣", x: 1, y: 1, image: art("densetsuno_ken"), effect: "忍者の武人が新しい姿になる" },
 { id: "glasses", name: "きれいなメガネ", x: 6, y: 6, image: art("kireina_megane"), effect: "森の戦闘で技のダメージ＋2" },
 { id: "muffler", name: "きれいなマフラー", x: 3, y: 6, image: art("kireina_muffler"), effect: "森の戦闘で最大HP＋8" },
];
export function nextForestPowmon(pool: PowmonId[], collection: PowmonId[]) { return pool.find((id) => !collection.includes(id)); }
