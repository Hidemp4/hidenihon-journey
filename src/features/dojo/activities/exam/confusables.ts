/**
 * Kana e kanji que se confundem pelo desenho. Os conjuntos podem misturar alfabetos (し × ン):
 * no modo "Ambos" isso vira distrator; num alfabeto só, o que não está no baralho é ignorado.
 */
export const CONFUSABLE_SETS: ReadonlyArray<readonly string[]> = [
  // Os pedidos na especificação.
  ["し", "つ", "そ", "ン"],
  ["ぬ", "め"],
  ["ろ", "る"],
  ["は", "ほ"],
  ["わ", "れ", "ね"],
  ["シ", "ツ", "ソ", "ン"],
  ["ク", "ケ", "タ"],
  ["ウ", "ワ"],
  // Outros pares clássicos de confusão visual (ajuste à vontade: só mudam a escolha dos distratores).
  ["さ", "ち"],
  ["き", "さ"],
  ["い", "り"],
  ["あ", "お"],
  ["ほ", "ま"],
  ["コ", "ユ", "ロ"],
  ["ス", "ヌ"],
  ["チ", "テ"],
  ["ナ", "メ"],
  ["ル", "レ"],
  ["ア", "マ"],
  // Kanji do N5 parecidos no desenho (ou que dividem uma parte: 門 em 間/聞, 言 em 読/語/話).
  ["人", "入", "八"],
  ["日", "目", "白", "百"],
  ["木", "本", "休"],
  ["大", "天"],
  ["千", "午", "年"],
  ["右", "左"],
  ["間", "聞"],
  ["読", "語", "話"],
  ["東", "車"],
  ["母", "毎"],
  ["出", "山"],
  ["小", "少"],
  ["今", "会"],
  ["名", "多"],
];

const BY_CHAR = new Map<string, Set<string>>();
for (const set of CONFUSABLE_SETS) {
  for (const char of set) {
    const related = BY_CHAR.get(char) ?? new Set<string>();
    for (const other of set) if (other !== char) related.add(other);
    BY_CHAR.set(char, related);
  }
}

/** Kana parecidos com `char` (vazio se não houver). */
export function confusablesOf(char: string): ReadonlySet<string> {
  return BY_CHAR.get(char) ?? new Set();
}
