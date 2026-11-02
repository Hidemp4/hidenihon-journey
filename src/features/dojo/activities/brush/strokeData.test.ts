import { describe, expect, it } from "vitest";
import { getKanaDeck } from "@/features/dojo/shared/kanaDeck";
import { getKanjiStudyItems } from "@/features/dojo/shared/kanjiDeck";
import raw from "./data/kanaStrokes.json";
import kanjiRaw from "./data/kanjiStrokes.json";
import { buildGlyphModel, loadKanaStrokes, loadStrokeSet, sanitizeStrokeSet } from "./strokeData";

describe("dados de traços", () => {
  it("o arquivo gerado tem todos os kana do app, com a contagem de traços dos dados do app", () => {
    const set = sanitizeStrokeSet(raw);
    if (!set) throw new Error("dados inválidos");
    expect(set.ref).toBe("r20260714");
    for (const kana of [...getKanaDeck("hiragana"), ...getKanaDeck("katakana")]) {
      const glyph = set.glyphs.get(kana.char);
      expect(glyph, kana.char).toBeDefined();
      expect(glyph?.strokes, kana.char).toHaveLength(kana.strokeCount);
    }
    expect(set.glyphs.size).toBe(92);
  });

  it("o arquivo de kanji tem os 103 do N5, com a contagem de traços do dataset (conferida também no KANJIDIC2)", () => {
    const set = sanitizeStrokeSet(kanjiRaw);
    if (!set) throw new Error("dados inválidos");
    for (const item of getKanjiStudyItems()) {
      expect(set.glyphs.get(item.char)?.strokes, item.char).toHaveLength(item.strokeCount);
    }
    expect(set.glyphs.size).toBe(103);
  });

  it("traz a atribuição do KanjiVG (CC BY-SA 3.0)", () => {
    for (const data of [raw, kanjiRaw]) {
      expect(data).toMatchObject({ source: "KanjiVG", copyright: "Ulrich Apel", license: "CC BY-SA 3.0", url: "https://kanjivg.tagaini.net" });
    }
  });

  it("carrega sob demanda (mesma promessa em cache)", async () => {
    const first = loadKanaStrokes();
    expect(loadKanaStrokes()).toBe(first);
    expect((await first).glyphs.get("あ")?.strokes).toHaveLength(3);
    expect(loadStrokeSet("kana")).toBe(first);
    expect((await loadStrokeSet("kanji")).glyphs.get("曜")).toBeUndefined();
    expect((await loadStrokeSet("kanji")).glyphs.get("駅")?.strokes).toHaveLength(14);
  });

  it("glifo inválido fica de fora; estrutura inválida devolve null", () => {
    const set = sanitizeStrokeSet({
      version: 1,
      viewBox: 109,
      chars: {
        ok: { s: ["M0,0L10,10"], n: [[1, 2]] },
        semNumero: { s: ["M20,20L30,30"], n: [] },
        quebrado: { s: ["isso não é caminho"], n: [] },
        vazio: { s: [], n: [] },
        tipoErrado: { s: "M0,0L1,1" },
      },
    });
    expect([...(set?.glyphs.keys() ?? [])]).toEqual(["ok", "semNumero"]);
    expect(set?.glyphs.get("semNumero")?.numbers).toEqual([[16, 18]]);

    expect(sanitizeStrokeSet(null)).toBeNull();
    expect(sanitizeStrokeSet({ version: 2, viewBox: 109, chars: {} })).toBeNull();
    expect(sanitizeStrokeSet({ version: 1, viewBox: 100, chars: { ok: { s: ["M0,0L1,1"] } } })).toBeNull();
    expect(sanitizeStrokeSet({ version: 1, viewBox: 109, chars: {} })).toBeNull();
  });

  it("modelo do glifo: pontos amostrados e comprimento por traço", () => {
    const glyph = buildGlyphModel("x", ["M0,0L10,0", "M0,10L0,40"], [[1, 1]]);
    expect(glyph?.strokes.map((stroke) => Math.round(stroke.length))).toEqual([10, 30]);
    expect(glyph?.numbers).toEqual([
      [1, 1],
      [-4, 8],
    ]);
  });
});
