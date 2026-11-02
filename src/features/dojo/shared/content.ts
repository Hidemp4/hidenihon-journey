import { getAvailableGroups, type KanaAlphabet, type KanaScript } from "./kanaDeck";
import { getKanjiGroups, getKanjiStudyItems, kunReadingParts } from "./kanjiDeck";
import { kanaToRomaji } from "./kanaToRomaji";
import { getKanaStudyItems, type KanjiStudyItem, type StudyItem } from "./studyItem";

/** O que se estuda numa atividade: kana (hiragana/katakana) ou os kanji do N5. */
export type StudyContent = "kana" | "kanji";

export const CONTENT_OPTIONS: ReadonlyArray<{ id: StudyContent; label: string; glyph: string }> = [
  { id: "kana", label: "Kana", glyph: "あア" },
  { id: "kanji", label: "Kanji N5", glyph: "日本" },
];

/** Grupo de qualquer conteúdo: kana trazem o alfabeto (rótulo no modo "Ambos"), kanji não. */
export interface ContentGroupOption {
  id: string;
  label: string;
  title: string;
  alphabet?: KanaScript;
}

export interface ContentSelection {
  content: StudyContent;
  alphabet: KanaAlphabet;
}

/** Grupos pertencem a um alfabeto ou aos kanji: se esta chave muda, a seleção de grupos é limpa. */
export function groupsKey({ content, alphabet }: ContentSelection): string {
  return content === "kanji" ? "kanji" : alphabet;
}

export function getContentGroups(selection: ContentSelection): readonly ContentGroupOption[] {
  return selection.content === "kanji" ? getKanjiGroups() : getAvailableGroups(selection.alphabet);
}

export function getContentItems(selection: ContentSelection, selectedGroupIds: readonly string[] = []): StudyItem[] {
  return selection.content === "kanji" ? getKanjiStudyItems(selectedGroupIds) : getKanaStudyItems(selection.alphabet, selectedGroupIds);
}

/** Só os ids de grupo que existem no conteúdo (o que vem do disco pode ser de outra versão). */
export function validGroupIds(selection: ContentSelection, raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set(getContentGroups(selection).map((group) => group.id));
  return raw.filter((id): id is string => typeof id === "string" && valid.has(id));
}

/**
 * As direções guardam os ids da época só-kana ("kana-to-romaji" = do caractere para a resposta),
 * para as configurações salvas continuarem valendo. O rótulo muda com o conteúdo.
 */
export type CharacterDirection = "kana-to-romaji" | "romaji-to-kana" | "mixed";

const DIRECTION_LABELS: Readonly<Record<StudyContent, Readonly<Record<CharacterDirection, string>>>> = {
  kana: { "kana-to-romaji": "Kana → romaji", "romaji-to-kana": "Romaji → kana", mixed: "Misto" },
  kanji: { "kana-to-romaji": "Kanji → significado", "romaji-to-kana": "Significado → kanji", mixed: "Misto" },
};

export function directionLabel(content: StudyContent, direction: CharacterDirection): string {
  return DIRECTION_LABELS[content][direction];
}

const SCRIPT_LABELS = { hiragana: "em hiragana", katakana: "em katakana" } as const;

/** Resposta curta ao ver o caractere: o romaji (kana) ou o 1º significado (kanji). */
export function answerOf(item: StudyItem): string {
  return item.kind === "kanji" ? item.meaning : item.romaji;
}

/** Complemento da pergunta inversa ("ka em hiragana", "água em kanji"). */
export function scriptLabel(item: StudyItem): string {
  return item.kind === "kanji" ? "em kanji" : SCRIPT_LABELS[item.script];
}

/** Leitura para texto corrido: "た(べる)" para kun'yomi com okurigana, "ひと〜" para prefixo, "〜か" para sufixo. */
export function formatKunReading(reading: string): string {
  const { stem, okurigana, prefix, suffix } = kunReadingParts(reading);
  return `${suffix ? "〜" : ""}${stem}${okurigana ? `(${okurigana})` : ""}${prefix ? "〜" : ""}`;
}

/** "On: ニチ・ジツ · Kun: ひ・〜か" (o que existir). */
export function readingsText(item: KanjiStudyItem): string {
  return [
    item.onyomi.length > 0 ? `On: ${item.onyomi.join("・")}` : "",
    item.kunyomi.length > 0 ? `Kun: ${item.kunyomi.map(formatKunReading).join("・")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export interface KanjiReading {
  /** Como aparece no verso: "ニチ", "た(べる)", "〜か". */
  kana: string;
  /** O mesmo no estilo de digitação do app: "nichi", "ta(beru)", "-ka". */
  romaji: string;
}

/** Leituras de um kanji, cada uma com o romaji (on'yomi em katakana; kun'yomi com o okurigana entre parênteses). */
export function kanjiReadings(item: KanjiStudyItem): { on: KanjiReading[]; kun: KanjiReading[] } {
  const romaji = (text: string) => kanaToRomaji(text) ?? "";
  return {
    on: item.onyomi.map((reading) => ({ kana: reading, romaji: romaji(reading) })),
    kun: item.kunyomi.map((reading) => {
      const { stem, okurigana, prefix, suffix } = kunReadingParts(reading);
      // Romaniza a leitura inteira e só depois separa o okurigana: o radical pode terminar
      // em っ, que dobra a consoante do okurigana (みっ.つ = "mit(tsu)", não "mi(tsu)").
      const whole = romaji(stem + okurigana);
      const tail = okurigana ? romaji(okurigana) : "";
      const head = whole.slice(0, whole.length - tail.length);
      return {
        kana: formatKunReading(reading),
        romaji: `${suffix ? "-" : ""}${head}${tail ? `(${tail})` : ""}${prefix ? "-" : ""}`,
      };
    }),
  };
}

/** Resposta completa para o feedback: "か (ka)" ou "日 (dia, sol)". */
export function answerText(item: StudyItem): string {
  return item.kind === "kanji" ? `${item.char} (${item.meanings.join(", ")})` : `${item.char} (${item.romaji})`;
}
