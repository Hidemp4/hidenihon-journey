import type { JapaneseChar, LessonGroup } from "@/data/hiragana";
import { hiraganaGroups } from "@/data/hiragana";
import { katakanaGroups } from "@/data/katakana";

export type KanaScript = "hiragana" | "katakana";
export type KanaAlphabet = KanaScript | "mixed";

export interface TrainingKana extends JapaneseChar {
  alphabet: KanaScript;
  /** Único entre alfabetos (`alphabet:group`), evita fundir grupos no modo misto. */
  groupId: string;
  groupTitle: string;
}

export interface KanaGroupOption {
  id: string;
  title: string;
  label: string;
  alphabet: KanaScript;
}

function mapGroups(groups: LessonGroup[], alphabet: KanaScript): TrainingKana[] {
  return groups.flatMap((group) =>
    group.chars.map((kana) => ({
      ...kana,
      alphabet,
      groupId: `${alphabet}:${kana.group}`,
      groupTitle: group.title,
    }))
  );
}

function getShortGroupLabel(title: string) {
  return title.split(" ")[0] || title;
}

function buildGroupOptions(deck: TrainingKana[]): KanaGroupOption[] {
  const seen = new Map<string, KanaGroupOption>();

  for (const kana of deck) {
    if (seen.has(kana.groupId)) continue;
    seen.set(kana.groupId, {
      id: kana.groupId,
      title: kana.groupTitle,
      label: getShortGroupLabel(kana.groupTitle),
      alphabet: kana.alphabet,
    });
  }

  return Array.from(seen.values());
}

const HIRAGANA_DECK = mapGroups(hiraganaGroups, "hiragana");
const KATAKANA_DECK = mapGroups(katakanaGroups, "katakana");

const DECKS: Record<KanaAlphabet, TrainingKana[]> = {
  hiragana: HIRAGANA_DECK,
  katakana: KATAKANA_DECK,
  mixed: [...HIRAGANA_DECK, ...KATAKANA_DECK],
};

const GROUP_OPTIONS: Record<KanaAlphabet, KanaGroupOption[]> = {
  hiragana: buildGroupOptions(DECKS.hiragana),
  katakana: buildGroupOptions(DECKS.katakana),
  mixed: buildGroupOptions(DECKS.mixed),
};

export function getKanaDeck(alphabet: KanaAlphabet): TrainingKana[] {
  return DECKS[alphabet];
}

export function getAvailableGroups(alphabet: KanaAlphabet): KanaGroupOption[] {
  return GROUP_OPTIONS[alphabet];
}

export function filterKanaDeck(alphabet: KanaAlphabet, selectedGroupIds: readonly string[]): TrainingKana[] {
  const deck = DECKS[alphabet];
  if (selectedGroupIds.length === 0) return deck;

  const selected = new Set(selectedGroupIds);
  return deck.filter((kana) => selected.has(kana.groupId));
}
