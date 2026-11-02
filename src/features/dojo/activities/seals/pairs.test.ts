import { describe, expect, it } from "vitest";
import { createRng } from "@/features/dojo/shared/components/arena/rng";
import { getKanaStudyItems } from "@/features/dojo/shared/studyItem";
import { DEFAULT_SEALS_SETTINGS } from "./constants";
import {
  buildSealPairs,
  contentSelection,
  countDistinctPairs,
  dealCards,
  hiraganaKatakanaPairs,
  kanaRomajiPairs,
  pairWeight,
  pickPairs,
  SEALS_CONFIG_KEYS,
  sealsConfigKey,
} from "./pairs";

const HIRAGANA = getKanaStudyItems("hiragana");
const KATAKANA = getKanaStudyItems("katakana");

describe("Selos: pares a partir do conteúdo", () => {
  it("kana ↔ romaji: um par por kana, uma carta de cada lado", () => {
    const pairs = kanaRomajiPairs(HIRAGANA);
    expect(pairs).toHaveLength(46);
    expect(pairs[0]).toMatchObject({
      id: "hiragana:あ",
      faces: [
        { text: "あ", lang: "ja" },
        { text: "a", lang: null },
      ],
    });
    expect(pairs[0].items.map((item) => item.id)).toEqual(["hiragana:あ"]);
  });

  it("hiragana ↔ katakana: liga pelo som e conta para os dois kana", () => {
    const pairs = hiraganaKatakanaPairs(HIRAGANA, KATAKANA);
    expect(pairs).toHaveLength(46);
    for (const pair of pairs) {
      const [hiragana, katakana] = pair.items;
      if (hiragana.kind !== "kana" || katakana.kind !== "kana") throw new Error("par de kana esperado");
      expect(hiragana.script).toBe("hiragana");
      expect(katakana.script).toBe("katakana");
      expect(hiragana.romaji).toBe(katakana.romaji);
      expect(pair.faces.map((face) => face.text)).toEqual([hiragana.char, katakana.char]);
    }
  });

  it("hiragana ↔ katakana filtra pelos grupos do hiragana; sem parceiro, o kana fica de fora", () => {
    const pairs = buildSealPairs({ ...DEFAULT_SEALS_SETTINGS, pairType: "hiragana-katakana", selectedGroupIds: ["hiragana:ka-row"] });
    expect(pairs.map((pair) => pair.faces.map((face) => face.text).join(""))).toEqual(["かカ", "きキ", "くク", "けケ", "こコ"]);
    expect(hiraganaKatakanaPairs(HIRAGANA.slice(0, 2), KATAKANA.slice(1, 2))).toHaveLength(1);
  });

  it("o conteúdo é o hiragana em hiragana ↔ katakana e os temas de kanji em kanji ↔ significado", () => {
    expect(contentSelection({ pairType: "hiragana-katakana", alphabet: "katakana" })).toEqual({ content: "kana", alphabet: "hiragana" });
    expect(contentSelection({ pairType: "kana-romaji", alphabet: "katakana" })).toEqual({ content: "kana", alphabet: "katakana" });
    expect(contentSelection({ pairType: "kanji-meaning", alphabet: "katakana" })).toMatchObject({ content: "kanji" });
  });

  it("kanji ↔ significado: o kanji de um lado, o 1º significado do outro; filtra pelos temas", () => {
    const pairs = buildSealPairs({ ...DEFAULT_SEALS_SETTINGS, pairType: "kanji-meaning", selectedGroupIds: ["kanji:body"] });
    expect(pairs.map((pair) => pair.faces.map((face) => face.text).join("="))).toEqual(["口=boca", "目=olho", "耳=orelha", "手=mão", "足=pé"]);
    expect(pairs[0]).toMatchObject({ id: "kanji:口", faces: [{ lang: "ja" }, { lang: null }] });
    // Os 103 significados são únicos: dá para montar a maior mesa com qualquer sorteio.
    expect(countDistinctPairs(buildSealPairs({ ...DEFAULT_SEALS_SETTINGS, pairType: "kanji-meaning" }))).toBe(103);
  });

  it("chave do recorde: tipo + alfabeto + tamanho (15 combinações possíveis)", () => {
    expect(sealsConfigKey({ pairType: "kana-romaji", alphabet: "mixed", sizeId: "4x6" })).toBe("kana-romaji:mixed:4x6");
    expect(sealsConfigKey({ pairType: "hiragana-katakana", alphabet: "katakana", sizeId: "3x4" })).toBe("hiragana-katakana:both:3x4");
    expect(sealsConfigKey({ pairType: "kanji-meaning", alphabet: "mixed", sizeId: "4x4" })).toBe("kanji-meaning:kanji:4x4");
    expect(SEALS_CONFIG_KEYS.size).toBe(15);
  });
});

describe("Selos: sorteio dos pares", () => {
  const MIXED = kanaRomajiPairs(getKanaStudyItems("mixed"));

  it("no modo 'Ambos' nunca põe dois pares com o mesmo romaji (uma carta combinaria com duas)", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const pairs = pickPairs(MIXED, 12, createRng(seed));
      const texts = pairs.flatMap((pair) => pair.faces.map((face) => face.text));
      expect(pairs).toHaveLength(12);
      expect(new Set(texts).size).toBe(24);
    }
    // 92 kana, mas só 46 sons distintos.
    expect(countDistinctPairs(MIXED)).toBe(46);
  });

  it("conteúdo pequeno devolve menos pares, sem travar nem repetir", () => {
    const yaRow = kanaRomajiPairs(getKanaStudyItems("hiragana", ["hiragana:ya-row"]));
    const pairs = pickPairs(yaRow, 6, createRng(3));
    expect(pairs).toHaveLength(3);
    expect(new Set(pairs.map((pair) => pair.id)).size).toBe(3);
    expect(countDistinctPairs(yaRow)).toBe(3);
    expect(pickPairs([], 6, createRng(1))).toEqual([]);
  });

  it("descarta par cujas duas cartas seriam iguais", () => {
    const [pair] = kanaRomajiPairs(HIRAGANA);
    const broken = { ...pair, id: "quebrado", faces: [pair.faces[0], pair.faces[0]] as const };
    expect(pickPairs([broken], 1, createRng(1))).toEqual([]);
  });

  it("pondera pelo domínio: o item mais fraco quase sempre entra", () => {
    const seven = kanaRomajiPairs(HIRAGANA.slice(0, 7));
    const weak = seven[6];
    const heavy = new Map([[weak.items[0].id, 5]]);

    let withWeights = 0;
    let withoutWeights = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      if (pickPairs(seven, 6, createRng(seed), (pair) => pairWeight(pair, heavy)).includes(weak)) withWeights += 1;
      if (pickPairs(seven, 6, createRng(seed)).includes(weak)) withoutWeights += 1;
    }
    expect(withWeights).toBeGreaterThan(withoutWeights);
    expect(withWeights).toBeGreaterThan(190);
  });

  it("peso do par hiragana ↔ katakana é o do kana mais fraco", () => {
    const [pair] = hiraganaKatakanaPairs(HIRAGANA, KATAKANA);
    expect(pairWeight(pair, new Map([["katakana:ア", 4]]))).toBe(4);
    expect(pairWeight(pair, new Map())).toBe(1);
  });
});

describe("Selos: distribuição das cartas", () => {
  const pairs = kanaRomajiPairs(HIRAGANA.slice(0, 8));

  it("duas cartas por par, posições 0…n-1", () => {
    const cards = dealCards(pairs, createRng(9));
    expect(cards).toHaveLength(16);
    expect(cards.map((card) => card.index)).toEqual([...Array(16).keys()]);
    for (const pair of pairs) expect(cards.filter((card) => card.pairId === pair.id)).toHaveLength(2);
  });

  it("embaralha com o rng injetado: mesma semente, mesma mesa", () => {
    const order = (seed: number) => dealCards(pairs, createRng(seed)).map((card) => card.face.text).join(",");
    expect(order(5)).toBe(order(5));
    expect(order(5)).not.toBe(order(6));
  });
});
