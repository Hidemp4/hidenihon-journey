/**
 * Kana → romaji para as leituras dos kanji, no mesmo estilo de digitação do resto do app
 * (Hepburn com vogal longa escrita por extenso: コウ = "kou", ジュウ = "juu").
 */

const BASE: Readonly<Record<string, string>> = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", ゐ: "i", ゑ: "e", を: "o", ん: "n",
  ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o",
};

/** Sílaba + ゃ/ゅ/ょ pequeno: きゃ = "kya", しょ = "sho", ちゅ = "chu", じょ = "jo". */
const SMALL_Y: Readonly<Record<string, string>> = { ゃ: "a", ゅ: "u", ょ: "o" };
const Y_STEM_EXCEPTIONS: Readonly<Record<string, string>> = { し: "sh", ち: "ch", じ: "j", ぢ: "j" };

/** Katakana → hiragana pelo deslocamento fixo do Unicode (ァ…ヶ ↔ ぁ…ゖ). */
export function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

/** `null` se aparecer algo que não é kana (o chamador decide o que mostrar). */
export function kanaToRomaji(text: string): string | null {
  const kana = toHiragana(text);
  let result = "";
  let geminate = false;

  for (let index = 0; index < kana.length; index += 1) {
    const char = kana[index];

    if (char === "っ") {
      geminate = true;
      continue;
    }
    if (char === "ー") {
      // Vogal longa do katakana: repete a última vogal (コーヒー = "koohii").
      const last = result[result.length - 1];
      if (!last || !"aeiou".includes(last)) return null;
      result += last;
      continue;
    }

    let syllable = BASE[char];
    if (syllable === undefined) return null;

    const small = SMALL_Y[kana[index + 1]];
    if (small && syllable.endsWith("i") && char !== "い") {
      const stem = Y_STEM_EXCEPTIONS[char];
      syllable = stem ? `${stem}${small}` : `${syllable.slice(0, -1)}y${small}`;
      index += 1;
    }

    if (char === "ん" && /^[aeiouy]/.test(BASE[kana[index + 1]] ?? "")) {
      // ん antes de vogal ou y: "n'" desfaz a ambiguidade (きんえん = "kin'en", não "ki-nen").
      syllable = "n'";
    }

    if (geminate) {
      // っ dobra a consoante seguinte; antes de "ch" vira "t" (まっちゃ = "matcha").
      result += syllable.startsWith("ch") ? "t" : syllable[0];
      geminate = false;
    }
    result += syllable;
  }

  // っ no fim (interjeição) não tem som para dobrar.
  return result;
}
