export interface JapaneseChar {
  char: string;
  romaji: string;
  strokeCount: number;
  group: string;
  strokePaths?: string[];
}

export interface LessonGroup {
  id: string;
  title: string;
  chars: JapaneseChar[];
  readingWords: ReadingWord[];
}

export interface ReadingWord {
  word: string;
  romaji: string;
  meaning: string;
  emoji: string;
}

export const hiraganaGroups: LessonGroup[] = [
  {
    id: "a-row",
    title: "あ行 (A・I・U・E・O)",
    chars: [
      { char: "あ", romaji: "a", strokeCount: 3, group: "a-row" },
      { char: "い", romaji: "i", strokeCount: 2, group: "a-row" },
      { char: "う", romaji: "u", strokeCount: 2, group: "a-row" },
      { char: "え", romaji: "e", strokeCount: 2, group: "a-row" },
      { char: "お", romaji: "o", strokeCount: 3, group: "a-row" },
    ],
    readingWords: [
      { word: "いえ", romaji: "ie", meaning: "casa", emoji: "🏠" },
      { word: "うえ", romaji: "ue", meaning: "em cima", emoji: "⬆️" },
      { word: "あお", romaji: "ao", meaning: "azul", emoji: "💙" },
      { word: "あい", romaji: "ai", meaning: "amor", emoji: "❤️" },
      { word: "おちゃ", romaji: "ocha", meaning: "chá", emoji: "🍵" },
    ],
  },
  {
    id: "ka-row",
    title: "か行 (KA・KI・KU・KE・KO)",
    chars: [
      { char: "か", romaji: "ka", strokeCount: 3, group: "ka-row" },
      { char: "き", romaji: "ki", strokeCount: 4, group: "ka-row" },
      { char: "く", romaji: "ku", strokeCount: 1, group: "ka-row" },
      { char: "け", romaji: "ke", strokeCount: 3, group: "ka-row" },
      { char: "こ", romaji: "ko", strokeCount: 2, group: "ka-row" },
    ],
    readingWords: [
      { word: "かお", romaji: "kao", meaning: "rosto", emoji: "😊" },
      { word: "かき", romaji: "kaki", meaning: "caqui", emoji: "🍊" },
      { word: "かさ", romaji: "kasa", meaning: "guarda-chuva", emoji: "☂️" },
      { word: "こい", romaji: "koi", meaning: "carpa", emoji: "🐟" },
      { word: "きって", romaji: "kitte", meaning: "selo", emoji: "📮" },
    ],
  },
  {
    id: "sa-row",
    title: "さ行 (SA・SHI・SU・SE・SO)",
    chars: [
      { char: "さ", romaji: "sa", strokeCount: 3, group: "sa-row" },
      { char: "し", romaji: "shi", strokeCount: 1, group: "sa-row" },
      { char: "す", romaji: "su", strokeCount: 2, group: "sa-row" },
      { char: "せ", romaji: "se", strokeCount: 3, group: "sa-row" },
      { char: "そ", romaji: "so", strokeCount: 1, group: "sa-row" },
    ],
    readingWords: [
      { word: "さくら", romaji: "sakura", meaning: "cerejeira", emoji: "🌸" },
      { word: "すし", romaji: "sushi", meaning: "sushi", emoji: "🍣" },
      { word: "しお", romaji: "shio", meaning: "sal", emoji: "🧂" },
      { word: "そら", romaji: "sora", meaning: "céu", emoji: "🌤️" },
      { word: "さけ", romaji: "sake", meaning: "sake / salmão", emoji: "🍶" },
    ],
  },
  {
    id: "ta-row",
    title: "た行 (TA・CHI・TSU・TE・TO)",
    chars: [
      { char: "た", romaji: "ta", strokeCount: 4, group: "ta-row" },
      { char: "ち", romaji: "chi", strokeCount: 2, group: "ta-row" },
      { char: "つ", romaji: "tsu", strokeCount: 1, group: "ta-row" },
      { char: "て", romaji: "te", strokeCount: 1, group: "ta-row" },
      { char: "と", romaji: "to", strokeCount: 2, group: "ta-row" },
    ],
    readingWords: [
      { word: "たこ", romaji: "tako", meaning: "polvo", emoji: "🐙" },
      { word: "てつ", romaji: "tetsu", meaning: "ferro", emoji: "⚙️" },
      { word: "つなみ", romaji: "tsunami", meaning: "tsunami", emoji: "🌊" },
      { word: "とり", romaji: "tori", meaning: "pássaro", emoji: "🐦" },
      { word: "つき", romaji: "tsuki", meaning: "lua", emoji: "🌙" },
    ],
  },
  {
    id: "na-row",
    title: "な行 (NA・NI・NU・NE・NO)",
    chars: [
      { char: "な", romaji: "na", strokeCount: 4, group: "na-row" },
      { char: "に", romaji: "ni", strokeCount: 3, group: "na-row" },
      { char: "ぬ", romaji: "nu", strokeCount: 2, group: "na-row" },
      { char: "ね", romaji: "ne", strokeCount: 2, group: "na-row" },
      { char: "の", romaji: "no", strokeCount: 1, group: "na-row" },
    ],
    readingWords: [
      { word: "ねこ", romaji: "neko", meaning: "gato", emoji: "🐱" },
      { word: "にく", romaji: "niku", meaning: "carne", emoji: "🥩" },
      { word: "のり", romaji: "nori", meaning: "alga nori", emoji: "🌿" },
      { word: "なつ", romaji: "natsu", meaning: "verão", emoji: "☀️" },
      { word: "にほん", romaji: "nihon", meaning: "Japão", emoji: "🇯🇵" },
    ],
  },
  {
    id: "ha-row",
    title: "は行 (HA・HI・FU・HE・HO)",
    chars: [
      { char: "は", romaji: "ha", strokeCount: 3, group: "ha-row" },
      { char: "ひ", romaji: "hi", strokeCount: 1, group: "ha-row" },
      { char: "ふ", romaji: "fu", strokeCount: 4, group: "ha-row" },
      { char: "へ", romaji: "he", strokeCount: 1, group: "ha-row" },
      { char: "ほ", romaji: "ho", strokeCount: 4, group: "ha-row" },
    ],
    readingWords: [
      { word: "はな", romaji: "hana", meaning: "flor / nariz", emoji: "🌸" },
      { word: "ひと", romaji: "hito", meaning: "pessoa", emoji: "🧑" },
      { word: "ほてる", romaji: "hoteru", meaning: "hotel", emoji: "🏨" },
      { word: "ほし", romaji: "hoshi", meaning: "estrela", emoji: "⭐" },
      { word: "へや", romaji: "heya", meaning: "quarto", emoji: "🛏️" },
    ],
  },
  {
    id: "ma-row",
    title: "ま行 (MA・MI・MU・ME・MO)",
    chars: [
      { char: "ま", romaji: "ma", strokeCount: 3, group: "ma-row" },
      { char: "み", romaji: "mi", strokeCount: 2, group: "ma-row" },
      { char: "む", romaji: "mu", strokeCount: 3, group: "ma-row" },
      { char: "め", romaji: "me", strokeCount: 2, group: "ma-row" },
      { char: "も", romaji: "mo", strokeCount: 3, group: "ma-row" },
    ],
    readingWords: [
      { word: "みず", romaji: "mizu", meaning: "água", emoji: "💧" },
      { word: "まち", romaji: "machi", meaning: "cidade", emoji: "🏙️" },
      { word: "まんが", romaji: "manga", meaning: "mangá", emoji: "📚" },
      { word: "みらい", romaji: "mirai", meaning: "futuro", emoji: "🔮" },
      { word: "もも", romaji: "momo", meaning: "pêssego", emoji: "🍑" },
    ],
  },
  {
    id: "ya-row",
    title: "や行 (YA・YU・YO)",
    chars: [
      { char: "や", romaji: "ya", strokeCount: 3, group: "ya-row" },
      { char: "ゆ", romaji: "yu", strokeCount: 2, group: "ya-row" },
      { char: "よ", romaji: "yo", strokeCount: 2, group: "ya-row" },
    ],
    readingWords: [
      { word: "やま", romaji: "yama", meaning: "montanha", emoji: "⛰️" },
      { word: "ゆき", romaji: "yuki", meaning: "neve", emoji: "❄️" },
      { word: "よる", romaji: "yoru", meaning: "noite", emoji: "🌙" },
      { word: "やさい", romaji: "yasai", meaning: "legume / verdura", emoji: "🥦" },
      { word: "ゆめ", romaji: "yume", meaning: "sonho", emoji: "💭" },
    ],
  },
  {
    id: "ra-row",
    title: "ら行 (RA・RI・RU・RE・RO)",
    chars: [
      { char: "ら", romaji: "ra", strokeCount: 2, group: "ra-row" },
      { char: "り", romaji: "ri", strokeCount: 2, group: "ra-row" },
      { char: "る", romaji: "ru", strokeCount: 1, group: "ra-row" },
      { char: "れ", romaji: "re", strokeCount: 2, group: "ra-row" },
      { char: "ろ", romaji: "ro", strokeCount: 1, group: "ra-row" },
    ],
    readingWords: [
      { word: "りんご", romaji: "ringo", meaning: "maçã", emoji: "🍎" },
      { word: "さくら", romaji: "sakura", meaning: "cerejeira", emoji: "🌸" },
      { word: "れすとらん", romaji: "resutoran", meaning: "restaurante", emoji: "🍽️" },
      { word: "れい", romaji: "rei", meaning: "zero / exemplo", emoji: "0️⃣" },
      { word: "ろく", romaji: "roku", meaning: "seis", emoji: "6️⃣" },
    ],
  },
  {
    id: "wa-row",
    title: "わ行 + ん (WA・WO・N)",
    chars: [
      { char: "わ", romaji: "wa", strokeCount: 2, group: "wa-row" },
      { char: "を", romaji: "wo", strokeCount: 3, group: "wa-row" },
      { char: "ん", romaji: "n", strokeCount: 1, group: "wa-row" },
    ],
    readingWords: [
      { word: "わに", romaji: "wani", meaning: "crocodilo", emoji: "🐊" },
      { word: "みかん", romaji: "mikan", meaning: "tangerina", emoji: "🍊" },
      { word: "かんぱい", romaji: "kanpai", meaning: "saúde! (brinde)", emoji: "🥂" },
      { word: "にほん", romaji: "nihon", meaning: "Japão", emoji: "🇯🇵" },
      { word: "おんがく", romaji: "ongaku", meaning: "música", emoji: "🎵" },
    ],
  },
];

export const allHiragana: JapaneseChar[] = hiraganaGroups.flatMap(g => g.chars);
