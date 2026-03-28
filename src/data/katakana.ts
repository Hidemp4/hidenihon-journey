import type { LessonGroup, JapaneseChar } from "./hiragana";

export const katakanaGroups: LessonGroup[] = [
  {
    id: "ka-a-row",
    title: "ア行 (A・I・U・E・O)",
    chars: [
      { char: "ア", romaji: "a", strokeCount: 2, group: "ka-a-row" },
      { char: "イ", romaji: "i", strokeCount: 2, group: "ka-a-row" },
      { char: "ウ", romaji: "u", strokeCount: 3, group: "ka-a-row" },
      { char: "エ", romaji: "e", strokeCount: 3, group: "ka-a-row" },
      { char: "オ", romaji: "o", strokeCount: 3, group: "ka-a-row" },
    ],
    readingWords: [
      { word: "アイス", romaji: "aisu", meaning: "sorvete", emoji: "🍦" },
      { word: "エア", romaji: "ea", meaning: "ar", emoji: "💨" },
      { word: "アイスクリーム", romaji: "aisu kurīmu", meaning: "sorvete", emoji: "🍦" },
      { word: "オイル", romaji: "oiru", meaning: "óleo", emoji: "🫙" },
      { word: "イメージ", romaji: "imēji", meaning: "imagem", emoji: "🖼️" },
    ],
  },
  {
    id: "ka-ka-row",
    title: "カ行 (KA・KI・KU・KE・KO)",
    chars: [
      { char: "カ", romaji: "ka", strokeCount: 2, group: "ka-ka-row" },
      { char: "キ", romaji: "ki", strokeCount: 3, group: "ka-ka-row" },
      { char: "ク", romaji: "ku", strokeCount: 2, group: "ka-ka-row" },
      { char: "ケ", romaji: "ke", strokeCount: 3, group: "ka-ka-row" },
      { char: "コ", romaji: "ko", strokeCount: 2, group: "ka-ka-row" },
    ],
    readingWords: [
      { word: "カメラ", romaji: "kamera", meaning: "câmera", emoji: "📷" },
      { word: "コーヒー", romaji: "kōhī", meaning: "café", emoji: "☕" },
      { word: "ケーキ", romaji: "kēki", meaning: "bolo", emoji: "🎂" },
      { word: "コンビニ", romaji: "konbini", meaning: "loja de conveniência", emoji: "🏪" },
      { word: "キー", romaji: "kī", meaning: "chave", emoji: "🔑" },
    ],
  },
  {
    id: "ka-sa-row",
    title: "サ行 (SA・SHI・SU・SE・SO)",
    chars: [
      { char: "サ", romaji: "sa", strokeCount: 3, group: "ka-sa-row" },
      { char: "シ", romaji: "shi", strokeCount: 3, group: "ka-sa-row" },
      { char: "ス", romaji: "su", strokeCount: 2, group: "ka-sa-row" },
      { char: "セ", romaji: "se", strokeCount: 2, group: "ka-sa-row" },
      { char: "ソ", romaji: "so", strokeCount: 2, group: "ka-sa-row" },
    ],
    readingWords: [
      { word: "スシ", romaji: "sushi", meaning: "sushi", emoji: "🍣" },
      { word: "サッカー", romaji: "sakkā", meaning: "futebol", emoji: "⚽" },
      { word: "シャツ", romaji: "shatsu", meaning: "camisa", emoji: "👕" },
      { word: "スーパー", romaji: "sūpā", meaning: "supermercado", emoji: "🛒" },
      { word: "セール", romaji: "sēru", meaning: "promoção", emoji: "🏷️" },
    ],
  },
  {
    id: "ka-ta-row",
    title: "タ行 (TA・CHI・TSU・TE・TO)",
    chars: [
      { char: "タ", romaji: "ta", strokeCount: 3, group: "ka-ta-row" },
      { char: "チ", romaji: "chi", strokeCount: 3, group: "ka-ta-row" },
      { char: "ツ", romaji: "tsu", strokeCount: 3, group: "ka-ta-row" },
      { char: "テ", romaji: "te", strokeCount: 3, group: "ka-ta-row" },
      { char: "ト", romaji: "to", strokeCount: 2, group: "ka-ta-row" },
    ],
    readingWords: [
      { word: "タコス", romaji: "takosu", meaning: "tacos", emoji: "🌮" },
      { word: "チーズ", romaji: "chīzu", meaning: "queijo", emoji: "🧀" },
      { word: "テスト", romaji: "tesuto", meaning: "teste", emoji: "📝" },
      { word: "トマト", romaji: "tomato", meaning: "tomate", emoji: "🍅" },
      { word: "ツナ", romaji: "tsuna", meaning: "atum", emoji: "🐟" },
    ],
  },
  {
    id: "ka-na-row",
    title: "ナ行 (NA・NI・NU・NE・NO)",
    chars: [
      { char: "ナ", romaji: "na", strokeCount: 2, group: "ka-na-row" },
      { char: "ニ", romaji: "ni", strokeCount: 2, group: "ka-na-row" },
      { char: "ヌ", romaji: "nu", strokeCount: 2, group: "ka-na-row" },
      { char: "ネ", romaji: "ne", strokeCount: 4, group: "ka-na-row" },
      { char: "ノ", romaji: "no", strokeCount: 1, group: "ka-na-row" },
    ],
    readingWords: [
      { word: "ナイフ", romaji: "naifu", meaning: "faca", emoji: "🔪" },
      { word: "ノート", romaji: "nōto", meaning: "caderno", emoji: "📓" },
      { word: "ネクタイ", romaji: "nekutai", meaning: "gravata", emoji: "👔" },
      { word: "ニュース", romaji: "nyūsu", meaning: "notícias", emoji: "📰" },
      { word: "ナス", romaji: "nasu", meaning: "berinjela", emoji: "🍆" },
    ],
  },
  {
    id: "ka-ha-row",
    title: "ハ行 (HA・HI・FU・HE・HO)",
    chars: [
      { char: "ハ", romaji: "ha", strokeCount: 2, group: "ka-ha-row" },
      { char: "ヒ", romaji: "hi", strokeCount: 2, group: "ka-ha-row" },
      { char: "フ", romaji: "fu", strokeCount: 1, group: "ka-ha-row" },
      { char: "ヘ", romaji: "he", strokeCount: 1, group: "ka-ha-row" },
      { char: "ホ", romaji: "ho", strokeCount: 4, group: "ka-ha-row" },
    ],
    readingWords: [
      { word: "ホテル", romaji: "hoteru", meaning: "hotel", emoji: "🏨" },
      { word: "ハンバーガー", romaji: "hanbāgā", meaning: "hambúrguer", emoji: "🍔" },
      { word: "フォーク", romaji: "fōku", meaning: "garfo", emoji: "🍴" },
      { word: "ヒーロー", romaji: "hīrō", meaning: "herói", emoji: "🦸" },
      { word: "ヘリコプター", romaji: "herikoputā", meaning: "helicóptero", emoji: "🚁" },
    ],
  },
  {
    id: "ka-ma-row",
    title: "マ行 (MA・MI・MU・ME・MO)",
    chars: [
      { char: "マ", romaji: "ma", strokeCount: 2, group: "ka-ma-row" },
      { char: "ミ", romaji: "mi", strokeCount: 3, group: "ka-ma-row" },
      { char: "ム", romaji: "mu", strokeCount: 2, group: "ka-ma-row" },
      { char: "メ", romaji: "me", strokeCount: 2, group: "ka-ma-row" },
      { char: "モ", romaji: "mo", strokeCount: 3, group: "ka-ma-row" },
    ],
    readingWords: [
      { word: "マンガ", romaji: "manga", meaning: "mangá", emoji: "📚" },
      { word: "メニュー", romaji: "menyū", meaning: "cardápio", emoji: "📋" },
      { word: "ミルク", romaji: "miruku", meaning: "leite", emoji: "🥛" },
      { word: "マスク", romaji: "masuku", meaning: "máscara", emoji: "😷" },
      { word: "モデル", romaji: "moderu", meaning: "modelo", emoji: "👗" },
    ],
  },
  {
    id: "ka-ya-row",
    title: "ヤ行 (YA・YU・YO)",
    chars: [
      { char: "ヤ", romaji: "ya", strokeCount: 2, group: "ka-ya-row" },
      { char: "ユ", romaji: "yu", strokeCount: 2, group: "ka-ya-row" },
      { char: "ヨ", romaji: "yo", strokeCount: 3, group: "ka-ya-row" },
    ],
    readingWords: [
      { word: "ヤシ", romaji: "yashi", meaning: "palmeira", emoji: "🌴" },
      { word: "ユニフォーム", romaji: "yunifōmu", meaning: "uniforme", emoji: "👕" },
      { word: "ヨーグルト", romaji: "yōguruto", meaning: "iogurte", emoji: "🥛" },
      { word: "ヤキトリ", romaji: "yakitori", meaning: "espeto de frango", emoji: "🍢" },
      { word: "ユーモア", romaji: "yūmoa", meaning: "humor", emoji: "😄" },
    ],
  },
  {
    id: "ka-ra-row",
    title: "ラ行 (RA・RI・RU・RE・RO)",
    chars: [
      { char: "ラ", romaji: "ra", strokeCount: 2, group: "ka-ra-row" },
      { char: "リ", romaji: "ri", strokeCount: 2, group: "ka-ra-row" },
      { char: "ル", romaji: "ru", strokeCount: 2, group: "ka-ra-row" },
      { char: "レ", romaji: "re", strokeCount: 1, group: "ka-ra-row" },
      { char: "ロ", romaji: "ro", strokeCount: 3, group: "ka-ra-row" },
    ],
    readingWords: [
      { word: "レストラン", romaji: "resutoran", meaning: "restaurante", emoji: "🍽️" },
      { word: "リンク", romaji: "rinku", meaning: "link", emoji: "🔗" },
      { word: "ラーメン", romaji: "rāmen", meaning: "ramen", emoji: "🍜" },
      { word: "レース", romaji: "rēsu", meaning: "corrida / renda", emoji: "🏎️" },
      { word: "ロボット", romaji: "robotto", meaning: "robô", emoji: "🤖" },
    ],
  },
  {
    id: "ka-wa-row",
    title: "ワ行 + ン (WA・WO・N)",
    chars: [
      { char: "ワ", romaji: "wa", strokeCount: 2, group: "ka-wa-row" },
      { char: "ヲ", romaji: "wo", strokeCount: 3, group: "ka-wa-row" },
      { char: "ン", romaji: "n", strokeCount: 2, group: "ka-wa-row" },
    ],
    readingWords: [
      { word: "ワイン", romaji: "wain", meaning: "vinho", emoji: "🍷" },
      { word: "ワンピース", romaji: "wanpīsu", meaning: "vestido", emoji: "👗" },
      { word: "パン", romaji: "pan", meaning: "pão", emoji: "🍞" },
      { word: "アイコン", romaji: "aikon", meaning: "ícone", emoji: "🖼️" },
      { word: "ワンダー", romaji: "wandā", meaning: "maravilha", emoji: "✨" },
    ],
  },
];

export const allKatakana: JapaneseChar[] = katakanaGroups.flatMap(g => g.chars);
