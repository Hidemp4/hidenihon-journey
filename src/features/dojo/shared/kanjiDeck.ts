import { kanjiN5Groups, type KanjiEntry } from "@/data/kanjiN5";
import { kanaToRomaji } from "./kanaToRomaji";
import { studyItemId, type KanjiStudyItem } from "./studyItem";

/** Mesmo formato dos grupos de kana (id único com prefixo), para os filtros e o armazenamento valerem igual. */
export interface KanjiGroupOption {
  id: string;
  title: string;
  label: string;
}

const groupId = (id: string) => `kanji:${id}`;

/** Leitura sem as marcas do KANJIDIC2: "た.べる" → "たべる", "ひと-" → "ひと". */
export function plainReading(reading: string): string {
  return reading.replace(/[.-]/g, "");
}

export interface KunReadingParts {
  /** Parte escrita com o kanji. */
  stem: string;
  /** Okurigana (escrito em kana depois do kanji). */
  okurigana: string;
  prefix: boolean;
  suffix: boolean;
}

/** Separa a kun'yomi para mostrar o okurigana mais claro (た·べる) e os hífens de forma presa. */
export function kunReadingParts(reading: string): KunReadingParts {
  const prefix = reading.endsWith("-");
  const suffix = reading.startsWith("-");
  const [stem, okurigana = ""] = reading.replace(/-/g, "").split(".");
  return { stem, okurigana, prefix, suffix };
}

export function kanjiToStudyItem(entry: KanjiEntry, group: { id: string; title: string }): KanjiStudyItem {
  const primary = entry.onyomi[0] ?? entry.kunyomi[0] ?? "";
  return {
    id: studyItemId("kanji", entry.char),
    kind: "kanji",
    char: entry.char,
    romaji: kanaToRomaji(plainReading(primary)) ?? "",
    readings: [...entry.onyomi, ...entry.kunyomi],
    meaning: entry.meanings[0],
    meanings: entry.meanings,
    onyomi: entry.onyomi,
    kunyomi: entry.kunyomi,
    strokeCount: entry.strokeCount,
    groupId: groupId(group.id),
    groupTitle: group.title,
  };
}

const KANJI_ITEMS: readonly KanjiStudyItem[] = kanjiN5Groups.flatMap((group) => group.chars.map((entry) => kanjiToStudyItem(entry, group)));
const KANJI_GROUPS: readonly KanjiGroupOption[] = kanjiN5Groups.map((group) => ({ id: groupId(group.id), title: group.title, label: group.title }));

export function getKanjiGroups(): readonly KanjiGroupOption[] {
  return KANJI_GROUPS;
}

/** Vazio = todos os temas. */
export function getKanjiStudyItems(selectedGroupIds: readonly string[] = []): KanjiStudyItem[] {
  if (selectedGroupIds.length === 0) return [...KANJI_ITEMS];
  const selected = new Set(selectedGroupIds);
  return KANJI_ITEMS.filter((item) => selected.has(item.groupId));
}
