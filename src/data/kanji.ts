import type { LessonGroup, JapaneseChar } from "./hiragana";

export const kanjiGroups: LessonGroup[] = [
  {
    id: "numbers",
    title: "数字 — Números",
    chars: [
      { char: "一", romaji: "ichi", strokeCount: 1, group: "numbers" },
      { char: "二", romaji: "ni", strokeCount: 2, group: "numbers" },
      { char: "三", romaji: "san", strokeCount: 3, group: "numbers" },
      { char: "四", romaji: "shi/yon", strokeCount: 5, group: "numbers" },
      { char: "五", romaji: "go", strokeCount: 4, group: "numbers" },
    ],
    readingWords: [
      { word: "一つ", romaji: "hitotsu", meaning: "um (objeto)", emoji: "1️⃣" },
      { word: "二つ", romaji: "futatsu", meaning: "dois (objetos)", emoji: "2️⃣" },
      { word: "三つ", romaji: "mittsu", meaning: "três (objetos)", emoji: "3️⃣" },
      { word: "四月", romaji: "shigatsu", meaning: "abril", emoji: "🌸" },
      { word: "五月", romaji: "gogatsu", meaning: "maio", emoji: "🌿" },
    ],
  },
  {
    id: "nature",
    title: "自然 — Natureza",
    chars: [
      { char: "山", romaji: "yama/san", strokeCount: 3, group: "nature" },
      { char: "川", romaji: "kawa/sen", strokeCount: 3, group: "nature" },
      { char: "木", romaji: "ki/moku", strokeCount: 4, group: "nature" },
      { char: "火", romaji: "hi/ka", strokeCount: 4, group: "nature" },
      { char: "水", romaji: "mizu/sui", strokeCount: 4, group: "nature" },
    ],
    readingWords: [
      { word: "山川", romaji: "yamakawa", meaning: "montanha e rio", emoji: "⛰️" },
      { word: "木火", romaji: "moku-hi", meaning: "madeira e fogo", emoji: "🔥" },
      { word: "水山", romaji: "mizu-yama", meaning: "água e montanha", emoji: "💧" },
      { word: "川木", romaji: "kawa-ki", meaning: "rio e árvore", emoji: "🌊" },
      { word: "火山", romaji: "kazan", meaning: "vulcão", emoji: "🌋" },
    ],
  },
  {
    id: "people",
    title: "人 — Pessoas",
    chars: [
      { char: "人", romaji: "hito/jin", strokeCount: 2, group: "people" },
      { char: "大", romaji: "oo/dai", strokeCount: 3, group: "people" },
      { char: "小", romaji: "chii/shou", strokeCount: 3, group: "people" },
      { char: "中", romaji: "naka/chuu", strokeCount: 4, group: "people" },
      { char: "上", romaji: "ue/jou", strokeCount: 3, group: "people" },
    ],
    readingWords: [
      { word: "大人", romaji: "otona", meaning: "adulto", emoji: "🧑" },
      { word: "小人", romaji: "kobito", meaning: "anão", emoji: "🧝" },
      { word: "中人", romaji: "chūnin", meaning: "pessoa do meio", emoji: "👥" },
      { word: "上人", romaji: "uehito", meaning: "pessoa acima", emoji: "⬆️" },
      { word: "大山", romaji: "ōyama", meaning: "grande montanha", emoji: "🏔️" },
    ],
  },
];

export const allKanji: JapaneseChar[] = kanjiGroups.flatMap(g => g.chars);
