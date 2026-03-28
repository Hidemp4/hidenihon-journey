/**
 * Data for the "Japonês na Prática" module.
 * Content based on Module 1-3 pedagogy workbook (Curso Japonês Essencial).
 * Covers: useful phrases, particle を (direct object), particle で (location/means).
 */
import type { LessonGroup, JapaneseChar } from "./hiragana";

// Fake chars used as section headers in the identification exercise
const makePhraseChars = (items: { char: string; romaji: string; group: string }[]): JapaneseChar[] =>
  items.map(i => ({ ...i, strokeCount: 0 }));

export const practicaGroups: LessonGroup[] = [
  {
    id: "frases-basicas",
    title: "Frases Básicas (挨拶)",
    chars: makePhraseChars([
      { char: "おはよう", romaji: "ohayou", group: "frases-basicas" },
      { char: "こんにちは", romaji: "konnichiwa", group: "frases-basicas" },
      { char: "こんばんは", romaji: "konbanwa", group: "frases-basicas" },
      { char: "ありがとう", romaji: "arigatou", group: "frases-basicas" },
      { char: "おやすみ", romaji: "oyasumi", group: "frases-basicas" },
    ]),
    readingWords: [
      { word: "おはよう", romaji: "ohayou", meaning: "bom dia", emoji: "🌅" },
      { word: "こんにちは", romaji: "konnichiwa", meaning: "boa tarde", emoji: "☀️" },
      { word: "こんばんは", romaji: "konbanwa", meaning: "boa noite", emoji: "🌙" },
      { word: "ありがとう", romaji: "arigatou", meaning: "obrigado(a)", emoji: "🙏" },
      { word: "さようなら", romaji: "sayounara", meaning: "adeus", emoji: "👋" },
    ],
  },
  {
    id: "vocabulario-pratico",
    title: "Vocabulário Prático",
    chars: makePhraseChars([
      { char: "おちゃ", romaji: "ocha", group: "vocabulario-pratico" },
      { char: "すし", romaji: "sushi", group: "vocabulario-pratico" },
      { char: "さくら", romaji: "sakura", group: "vocabulario-pratico" },
      { char: "りんご", romaji: "ringo", group: "vocabulario-pratico" },
      { char: "かさ", romaji: "kasa", group: "vocabulario-pratico" },
    ]),
    readingWords: [
      { word: "おちゃ", romaji: "ocha", meaning: "chá", emoji: "🍵" },
      { word: "すし", romaji: "sushi", meaning: "sushi", emoji: "🍣" },
      { word: "さくら", romaji: "sakura", meaning: "cerejeira", emoji: "🌸" },
      { word: "りんご", romaji: "ringo", meaning: "maçã", emoji: "🍎" },
      { word: "かさ", romaji: "kasa", meaning: "guarda-chuva", emoji: "☂️" },
    ],
  },
  {
    id: "particula-wo",
    title: "Partícula を (objeto direto)",
    chars: makePhraseChars([
      { char: "たべる", romaji: "taberu", group: "particula-wo" },
      { char: "のむ", romaji: "nomu", group: "particula-wo" },
      { char: "みる", romaji: "miru", group: "particula-wo" },
      { char: "かう", romaji: "kau", group: "particula-wo" },
      { char: "する", romaji: "suru", group: "particula-wo" },
    ]),
    readingWords: [
      { word: "すしをたべる", romaji: "sushi wo taberu", meaning: "comer sushi", emoji: "🍣" },
      { word: "おちゃをのむ", romaji: "ocha wo nomu", meaning: "beber chá", emoji: "🍵" },
      { word: "えいがをみる", romaji: "eiga wo miru", meaning: "assistir filme", emoji: "🎬" },
      { word: "ほんをかう", romaji: "hon wo kau", meaning: "comprar livro", emoji: "📚" },
      { word: "べんきょうをする", romaji: "benkyou wo suru", meaning: "estudar", emoji: "📝" },
    ],
  },
  {
    id: "particula-de",
    title: "Partícula で (local da ação)",
    chars: makePhraseChars([
      { char: "がっこう", romaji: "gakkou", group: "particula-de" },
      { char: "レストラン", romaji: "resutoran", group: "particula-de" },
      { char: "うち", romaji: "uchi", group: "particula-de" },
      { char: "こうえん", romaji: "kouen", group: "particula-de" },
      { char: "スーパー", romaji: "sūpā", group: "particula-de" },
    ]),
    readingWords: [
      { word: "がっこうでべんきょうする", romaji: "gakkou de benkyou suru", meaning: "estudar na escola", emoji: "🏫" },
      { word: "レストランでたべる", romaji: "resutoran de taberu", meaning: "comer no restaurante", emoji: "🍽️" },
      { word: "うちでやすむ", romaji: "uchi de yasumu", meaning: "descansar em casa", emoji: "🏠" },
      { word: "こうえんであそぶ", romaji: "kouen de asobu", meaning: "brincar no parque", emoji: "🌳" },
      { word: "スーパーでかう", romaji: "sūpā de kau", meaning: "comprar no mercado", emoji: "🛒" },
    ],
  },
];

export const allPratica: JapaneseChar[] = practicaGroups.flatMap(g => g.chars);
