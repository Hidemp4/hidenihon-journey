import { pickWeighted, type Rng } from "@/features/dojo/shared/components/arena/rng";
import { ALPHABET_OPTIONS } from "@/features/dojo/shared/constants";
import type { ContentSelection } from "@/features/dojo/shared/content";
import { getKanjiStudyItems } from "@/features/dojo/shared/kanjiDeck";
import { shuffle } from "@/features/dojo/shared/random";
import { getKanaStudyItems, type KanaStudyItem, type KanjiStudyItem } from "@/features/dojo/shared/studyItem";
import { BOARD_SIZES, PAIR_TYPE_OPTIONS } from "./constants";
import type { SealBoardSizeId, SealCard, SealFace, SealPair, SealsSettings } from "./types";

/** De onde saem o conteúdo e os grupos do filtro. */
export function contentSelection(settings: Pick<SealsSettings, "pairType" | "alphabet">): ContentSelection {
  if (settings.pairType === "kanji-meaning") return { content: "kanji", alphabet: settings.alphabet };
  // Hiragana ↔ katakana parte do hiragana (os grupos do filtro são os dele) e busca o katakana de mesmo som.
  return { content: "kana", alphabet: settings.pairType === "hiragana-katakana" ? "hiragana" : settings.alphabet };
}

/**
 * Recorde é por configuração: tipo de par + alfabeto + tamanho. Os grupos ficam de fora: quem pesa na
 * dificuldade é o número de pares, e uma chave por combinação de grupos espalharia o recorde em milhares.
 */
export function sealsConfigKey(settings: Pick<SealsSettings, "pairType" | "alphabet" | "sizeId">): string {
  const content = settings.pairType === "kana-romaji" ? settings.alphabet : settings.pairType === "kanji-meaning" ? "kanji" : "both";
  return `${settings.pairType}:${content}:${settings.sizeId}`;
}

/** Todas as chaves possíveis: o que vier do disco fora desta lista é descartado. */
export const SEALS_CONFIG_KEYS: ReadonlySet<string> = new Set(
  PAIR_TYPE_OPTIONS.flatMap(({ id: pairType }) =>
    ALPHABET_OPTIONS.flatMap(({ id: alphabet }) => BOARD_SIZES.map(({ id: sizeId }) => sealsConfigKey({ pairType, alphabet, sizeId })))
  )
);

/** Tamanho embutido na chave do recorde (o último trecho). */
export function sizeIdOfConfigKey(configKey: string): SealBoardSizeId | null {
  return BOARD_SIZES.find((size) => configKey.endsWith(`:${size.id}`))?.id ?? null;
}

function kanaFace(item: KanaStudyItem): SealFace {
  return { text: item.char, lang: "ja" };
}

export function kanaRomajiPairs(items: readonly KanaStudyItem[]): SealPair[] {
  return items.map((item) => ({ id: item.id, items: [item], faces: [kanaFace(item), { text: item.romaji, lang: null }] }));
}

/** Liga cada hiragana ao katakana de mesmo romaji; sem par no outro alfabeto, fica de fora. */
export function hiraganaKatakanaPairs(hiragana: readonly KanaStudyItem[], katakana: readonly KanaStudyItem[]): SealPair[] {
  const byRomaji = new Map(katakana.map((item) => [item.romaji, item]));
  return hiragana.flatMap((item) => {
    const partner = byRomaji.get(item.romaji);
    return partner ? [{ id: `${item.id}+${partner.id}`, items: [item, partner], faces: [kanaFace(item), kanaFace(partner)] as const }] : [];
  });
}

/** Kanji de um lado, o 1º significado (curto e único no dataset) do outro. */
export function kanjiMeaningPairs(items: readonly KanjiStudyItem[]): SealPair[] {
  return items.map((item) => ({ id: item.id, items: [item], faces: [{ text: item.char, lang: "ja" }, { text: item.meaning, lang: null }] }));
}

export function buildSealPairs(settings: SealsSettings): SealPair[] {
  if (settings.pairType === "kanji-meaning") return kanjiMeaningPairs(getKanjiStudyItems(settings.selectedGroupIds));
  if (settings.pairType === "hiragana-katakana") {
    return hiraganaKatakanaPairs(getKanaStudyItems("hiragana", settings.selectedGroupIds), getKanaStudyItems("katakana"));
  }
  return kanaRomajiPairs(getKanaStudyItems(settings.alphabet, settings.selectedGroupIds));
}

/** Peso do par = o do item mais fraco: o que a pessoa mais erra aparece mais na mesa. */
export function pairWeight(pair: SealPair, weights: ReadonlyMap<string, number>): number {
  return Math.max(...pair.items.map((item) => weights.get(item.id) ?? 1));
}

/**
 * Sorteia até `count` pares sem repetir nenhum texto de carta. Duas cartas iguais de pares
 * diferentes (no modo "Ambos", o "a" de あ e o "a" de ア) deixariam uma carta combinar com duas,
 * e o par que sobrasse ficaria órfão.
 */
export function pickPairs(candidates: readonly SealPair[], count: number, rng: Rng, weightOf: (pair: SealPair) => number = () => 1): SealPair[] {
  const chosen: SealPair[] = [];
  const usedIds = new Set<string>();
  const usedTexts = new Set<string>();
  const fits = (pair: SealPair) =>
    !usedIds.has(pair.id) && pair.faces[0].text !== pair.faces[1].text && pair.faces.every((face) => !usedTexts.has(face.text));

  while (chosen.length < count) {
    const available = candidates.filter(fits);
    if (available.length === 0) break;

    const pick = pickWeighted(rng, available.map((pair) => [pair, Math.max(0.0001, weightOf(pair))] as const)) ?? available[0];
    chosen.push(pick);
    usedIds.add(pick.id);
    for (const face of pick.faces) usedTexts.add(face.text);
  }

  return chosen;
}

/** Quantos pares cabem na mesa com este conteúdo (decide se o tabuleiro escolhido dá para montar). */
export function countDistinctPairs(candidates: readonly SealPair[]): number {
  // rng fixo em 0 = sempre o primeiro disponível: um guloso determinístico basta para kana.
  return pickPairs(candidates, candidates.length, () => 0).length;
}

/** Duas cartas por par, embaralhadas; a posição na mesa vira o índice da carta. */
export function dealCards(pairs: readonly SealPair[], rng: Rng): SealCard[] {
  const cards = pairs.flatMap((pair) => pair.faces.map((face) => ({ pairId: pair.id, face })));
  return shuffle(cards, rng).map((card, index) => ({ ...card, index }));
}
