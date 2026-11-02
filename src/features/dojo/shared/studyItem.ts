import { filterKanaDeck, type KanaAlphabet, type KanaScript, type TrainingKana } from "./kanaDeck";

export type StudyItemKind = "kana" | "kanji";

/** Prefixo do id: o alfabeto para kana (o mesmo som existe em hiragana e katakana) ou "kanji". */
export type StudyItemSource = KanaScript | "kanji";

interface StudyItemBase {
  /** `alphabet:char` ou `kanji:char`: é a chave do mastery store, então não pode mudar de formato. */
  id: string;
  char: string;
  /** Leitura principal em romaji (o que a pessoa digita/escolhe). */
  romaji: string;
  /** Todas as leituras aceitas. Para kana é só o romaji; para kanji, on'yomi e kun'yomi em kana. */
  readings: readonly string[];
  meaning?: string;
  groupId: string;
  groupTitle: string;
}

export interface KanaStudyItem extends StudyItemBase {
  kind: "kana";
  script: KanaScript;
}

export interface KanjiStudyItem extends StudyItemBase {
  kind: "kanji";
  /** O 1º significado (curto e único na lista): é o que o quiz e os Selos mostram. */
  meaning: string;
  meanings: readonly string[];
  /** Katakana. */
  onyomi: readonly string[];
  /** Hiragana com as marcas do KANJIDIC2 ("た.べる", "ひと-"). */
  kunyomi: readonly string[];
  strokeCount: number;
}

export type StudyItem = KanaStudyItem | KanjiStudyItem;

export function studyItemId(source: StudyItemSource, char: string) {
  return `${source}:${char}`;
}

/** Aceita só ids no formato que as atividades geram; o resto é lixo vindo do disco. */
export function isStudyItemId(value: string) {
  return /^(hiragana|katakana|kanji):.+$/u.test(value);
}

export function kanaToStudyItem(kana: TrainingKana): KanaStudyItem {
  return {
    id: studyItemId(kana.alphabet, kana.char),
    kind: "kana",
    script: kana.alphabet,
    char: kana.char,
    romaji: kana.romaji,
    readings: [kana.romaji],
    groupId: kana.groupId,
    groupTitle: kana.groupTitle,
  };
}

/** Mesmo filtro de grupos do `kanaDeck`, já no formato unificado. */
export function getKanaStudyItems(alphabet: KanaAlphabet, selectedGroupIds: readonly string[] = []): KanaStudyItem[] {
  return filterKanaDeck(alphabet, selectedGroupIds).map(kanaToStudyItem);
}
