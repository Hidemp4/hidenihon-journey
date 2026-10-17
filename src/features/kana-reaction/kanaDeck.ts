import type { JapaneseChar, LessonGroup } from "@/data/hiragana";
import { hiraganaGroups } from "@/data/hiragana";
import { katakanaGroups } from "@/data/katakana";

export type KanaAlphabet = "hiragana" | "katakana" | "mixed";

export interface TrainingKana extends JapaneseChar {
  alphabet: Exclude<KanaAlphabet, "mixed">;
  groupTitle: string;
}

function mapGroups(groups: LessonGroup[], alphabet: TrainingKana["alphabet"]): TrainingKana[] {
  return groups.flatMap((group) =>
    group.chars.map((kana) => ({
      ...kana,
      alphabet,
      groupTitle: group.title,
    }))
  );
}

const HIRAGANA_DECK = mapGroups(hiraganaGroups, "hiragana");
const KATAKANA_DECK = mapGroups(katakanaGroups, "katakana");

export function getKanaDeck(alphabet: KanaAlphabet): TrainingKana[] {
  if (alphabet === "hiragana") return HIRAGANA_DECK;
  if (alphabet === "katakana") return KATAKANA_DECK;
  return [...HIRAGANA_DECK, ...KATAKANA_DECK];
}

export function getAvailableGroups(alphabet: KanaAlphabet) {
  const seen = new Map<string, string>();

  for (const kana of getKanaDeck(alphabet)) {
    if (!seen.has(kana.group)) seen.set(kana.group, kana.groupTitle);
  }

  return Array.from(seen, ([id, title]) => ({ id, title }));
}

export function filterKanaDeck(alphabet: KanaAlphabet, selectedGroupIds: string[]) {
  const deck = getKanaDeck(alphabet);
  if (selectedGroupIds.length === 0) return deck;
  return deck.filter((kana) => selectedGroupIds.includes(kana.group));
}
