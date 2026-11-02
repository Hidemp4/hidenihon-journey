import { describe, expect, it } from "vitest";
import { kanjiN5Groups } from "@/data/kanjiN5";
import {
  answerOf,
  answerText,
  formatKunReading,
  getContentGroups,
  getContentItems,
  groupsKey,
  kanjiReadings,
  readingsText,
  scriptLabel,
  validGroupIds,
} from "./content";
import { getKanaStudyItems } from "./studyItem";
import { kanaToRomaji, toHiragana } from "./kanaToRomaji";
import { getKanjiGroups, getKanjiStudyItems, kunReadingParts, plainReading } from "./kanjiDeck";

const KANJI = getKanjiStudyItems();

describe("kana → romaji", () => {
  it("sílabas simples, dakuten, katakana e as exceções de Hepburn", () => {
    expect(kanaToRomaji("にち")).toBe("nichi");
    expect(kanaToRomaji("ジツ")).toBe("jitsu");
    expect(kanaToRomaji("ふね")).toBe("fune");
    expect(kanaToRomaji("ぎん")).toBe("gin");
    expect(toHiragana("カタカナ")).toBe("かたかな");
  });

  it("ゃゅょ pequenos, vogal longa por extenso e ー do katakana", () => {
    expect(kanaToRomaji("キュウ")).toBe("kyuu");
    expect(kanaToRomaji("ショウ")).toBe("shou");
    expect(kanaToRomaji("ジュウ")).toBe("juu");
    expect(kanaToRomaji("チュウ")).toBe("chuu");
    expect(kanaToRomaji("ヒャク")).toBe("hyaku");
    expect(kanaToRomaji("コーヒー")).toBe("koohii");
  });

  it("っ dobra a consoante (antes de ch vira t) e ん antes de vogal ganha apóstrofo", () => {
    expect(kanaToRomaji("みっつ")).toBe("mittsu");
    expect(kanaToRomaji("まっちゃ")).toBe("matcha");
    expect(kanaToRomaji("きんえん")).toBe("kin'en");
    expect(kanaToRomaji("ほん")).toBe("hon");
  });

  it("o que não é kana devolve null", () => {
    expect(kanaToRomaji("日")).toBeNull();
    expect(kanaToRomaji("ーあ")).toBeNull();
  });
});

describe("dataset de kanji N5", () => {
  it("103 kanji únicos, em 10 temas, com o 1º significado único", () => {
    expect(KANJI).toHaveLength(103);
    expect(new Set(KANJI.map((item) => item.char)).size).toBe(103);
    expect(new Set(KANJI.map((item) => item.meaning)).size).toBe(103);
    expect(kanjiN5Groups).toHaveLength(10);
    expect(getKanjiGroups().map((group) => group.id)).toContain("kanji:numbers");
  });

  it("on'yomi em katakana, kun'yomi em hiragana (com . e - do KANJIDIC2), traços e significados presentes", () => {
    for (const item of KANJI) {
      expect(item.onyomi.length + item.kunyomi.length, item.char).toBeGreaterThan(0);
      for (const on of item.onyomi) expect(on, item.char).toMatch(/^[゠-ヿ]+$/u);
      for (const kun of item.kunyomi) expect(kun, item.char).toMatch(/^-?[぀-ゟ]+(\.[぀-ゟ]+)?-?$/u);
      expect(item.strokeCount, item.char).toBeGreaterThan(0);
      expect(item.meanings.length, item.char).toBeGreaterThan(0);
      // Toda leitura vira romaji (senão o conversor não cobre algum kana usado).
      expect(item.romaji, item.char).toMatch(/^[a-z']+$/);
      for (const reading of item.readings) expect(kanaToRomaji(plainReading(reading)), `${item.char} ${reading}`).not.toBeNull();
    }
  });

  it("item de kanji no formato unificado (id kanji:char, grupo com prefixo)", () => {
    const sun = KANJI.find((item) => item.char === "日");
    expect(sun).toMatchObject({
      id: "kanji:日",
      kind: "kanji",
      romaji: "nichi",
      meaning: "dia",
      meanings: ["dia", "sol"],
      readings: ["ニチ", "ジツ", "ひ", "-か"],
      strokeCount: 4,
      groupId: "kanji:days",
      groupTitle: "Dias e elementos",
    });
    expect(getKanjiStudyItems(["kanji:body"]).map((item) => item.char).join("")).toBe("口目耳手足");
  });

  it("kun'yomi: okurigana e formas presas", () => {
    expect(kunReadingParts("た.べる")).toEqual({ stem: "た", okurigana: "べる", prefix: false, suffix: false });
    expect(kunReadingParts("ひと-")).toEqual({ stem: "ひと", okurigana: "", prefix: true, suffix: false });
    expect(formatKunReading("た.べる")).toBe("た(べる)");
    expect(formatKunReading("-か")).toBe("〜か");
    expect(plainReading("あ.がる")).toBe("あがる");
  });
});

describe("conteúdo (kana ou kanji)", () => {
  it("itens e grupos por conteúdo", () => {
    expect(getContentItems({ content: "kanji", alphabet: "katakana" })).toHaveLength(103);
    expect(getContentItems({ content: "kana", alphabet: "katakana" })).toHaveLength(46);
    expect(getContentGroups({ content: "kanji", alphabet: "hiragana" })).toHaveLength(10);
    expect(groupsKey({ content: "kanji", alphabet: "mixed" })).toBe("kanji");
    expect(groupsKey({ content: "kana", alphabet: "mixed" })).toBe("mixed");
  });

  it("valida os grupos contra o conteúdo", () => {
    expect(validGroupIds({ content: "kanji", alphabet: "hiragana" }, ["kanji:body", "hiragana:a-row", 3])).toEqual(["kanji:body"]);
    expect(validGroupIds({ content: "kana", alphabet: "hiragana" }, ["kanji:body", "hiragana:a-row"])).toEqual(["hiragana:a-row"]);
    expect(validGroupIds({ content: "kana", alphabet: "hiragana" }, "todos")).toEqual([]);
  });

  it("textos de resposta para kana e kanji", () => {
    const water = KANJI.find((item) => item.char === "水");
    const ka = getKanaStudyItems("hiragana").find((item) => item.char === "か");
    if (!water || !ka) throw new Error("item de teste ausente");
    expect(answerOf(water)).toBe("água");
    expect(answerOf(ka)).toBe("ka");
    expect(answerText(water)).toBe("水 (água)");
    expect(answerText(ka)).toBe("か (ka)");
    expect(scriptLabel(water)).toBe("em kanji");
    expect(scriptLabel(ka)).toBe("em hiragana");
    expect(readingsText(water)).toBe("On: スイ · Kun: みず");
    const food = KANJI.find((item) => item.char === "食");
    if (!food) throw new Error("item de teste ausente");
    expect(readingsText(food)).toBe("On: ショク · Kun: た(べる)・く(う)");
  });

  it("leituras com romaji para o verso dos Pergaminhos (okurigana e formas presas)", () => {
    const byChar = (char: string) => {
      const item = KANJI.find((candidate) => candidate.char === char);
      if (!item) throw new Error(`sem ${char}`);
      return kanjiReadings(item);
    };
    expect(byChar("食")).toEqual({
      on: [{ kana: "ショク", romaji: "shoku" }],
      kun: [
        { kana: "た(べる)", romaji: "ta(beru)" },
        { kana: "く(う)", romaji: "ku(u)" },
      ],
    });
    expect(byChar("日").kun).toEqual([
      { kana: "ひ", romaji: "hi" },
      { kana: "〜か", romaji: "-ka" },
    ]);
    expect(byChar("一").kun[0]).toEqual({ kana: "ひと〜", romaji: "hito-" });
    expect(byChar("三").kun).toContainEqual({ kana: "みっ(つ)", romaji: "mit(tsu)" });
  });

  it("toda leitura do dataset tem romaji, e romanizar em partes dá o mesmo que a leitura inteira", () => {
    for (const item of KANJI) {
      const { on, kun } = kanjiReadings(item);
      expect(on).toHaveLength(item.onyomi.length);
      expect(kun).toHaveLength(item.kunyomi.length);
      [...on, ...kun].forEach((reading, index) => {
        const source = [...item.onyomi, ...item.kunyomi][index];
        expect(reading.romaji, `${item.char} ${source}`).not.toBe("");
        expect(reading.romaji.replace(/[()-]/g, ""), `${item.char} ${source}`).toBe(kanaToRomaji(plainReading(source)));
      });
    }
  });
});
