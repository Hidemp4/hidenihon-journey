import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "@/features/dojo/shared/test/memoryStorage";
import { DEFAULT_SEALS_SETTINGS } from "./constants";
import {
  loadSealsBests,
  loadSealsSettings,
  sanitizeSealsBests,
  sanitizeSealsSettings,
  saveSealsBestIfBetter,
  saveSealsSettings,
} from "./sealsRepository";

const KEY = "hidenihon:dojo:seals:v1";
const BEST = { moves: 10, ms: 40_000, stars: 3, finishedAt: 5 };

describe("repositório dos Selos", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("guarda configurações e recordes na chave hidenihon:dojo:seals:v1, sem um apagar o outro", () => {
    saveSealsSettings({ ...DEFAULT_SEALS_SETTINGS, pairType: "hiragana-katakana", sizeId: "4x6", selectedGroupIds: ["hiragana:ka-row"] });
    expect(saveSealsBestIfBetter("hiragana-katakana:both:4x6", { ...BEST, moves: 20 })).toBe(true);

    expect(loadSealsSettings()).toEqual({ pairType: "hiragana-katakana", alphabet: "hiragana", sizeId: "4x6", selectedGroupIds: ["hiragana:ka-row"] });
    expect(loadSealsBests()).toEqual({ "hiragana-katakana:both:4x6": { ...BEST, moves: 20 } });
    expect(JSON.parse(localStorage.getItem(KEY) ?? "null").version).toBe(1);
  });

  it("recorde só troca quando melhora (menos jogadas; empate, menos tempo)", () => {
    const key = "kana-romaji:hiragana:3x4";
    saveSealsBestIfBetter(key, BEST);
    saveSealsBestIfBetter(key, { ...BEST, moves: 11, ms: 1, finishedAt: 6 });
    expect(loadSealsBests()[key]).toEqual(BEST);

    saveSealsBestIfBetter(key, { ...BEST, ms: 30_000, finishedAt: 7 });
    expect(loadSealsBests()[key]).toMatchObject({ moves: 10, ms: 30_000, finishedAt: 7 });

    // Mesmo resultado de novo (StrictMode, saída dupla): nada muda.
    saveSealsBestIfBetter(key, { ...BEST, ms: 30_000, finishedAt: 8 });
    expect(loadSealsBests()[key].finishedAt).toBe(7);
  });

  it("chave desconhecida não grava", () => {
    expect(saveSealsBestIfBetter("kana-romaji:klingon:3x4", BEST)).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("configuração inválida vira padrão, campo a campo", () => {
    expect(sanitizeSealsSettings({ pairType: "kanji", alphabet: "klingon", sizeId: "9x9", selectedGroupIds: "todos" })).toEqual(DEFAULT_SEALS_SETTINGS);
    expect(sanitizeSealsSettings({ pairType: "kana-romaji", alphabet: "katakana", sizeId: "4x4", selectedGroupIds: ["katakana:ka-ka-row", "hiragana:a-row", 7] })).toEqual({
      pairType: "kana-romaji",
      alphabet: "katakana",
      sizeId: "4x4",
      selectedGroupIds: ["katakana:ka-ka-row"],
    });
    // Em hiragana ↔ katakana os grupos valem contra o hiragana.
    expect(sanitizeSealsSettings({ pairType: "hiragana-katakana", alphabet: "katakana", selectedGroupIds: ["katakana:ka-ka-row", "hiragana:ka-row"] }).selectedGroupIds).toEqual([
      "hiragana:ka-row",
    ]);
  });

  it("recorde inválido é descartado, campo a campo", () => {
    expect(
      sanitizeSealsBests({
        "kana-romaji:hiragana:3x4": BEST,
        // Menos jogadas que pares (6) é impossível.
        "kana-romaji:katakana:3x4": { ...BEST, moves: 5 },
        "kana-romaji:mixed:3x4": { ...BEST, stars: 4 },
        "kana-romaji:hiragana:4x4": { ...BEST, moves: 12.5 },
        "kana-romaji:hiragana:4x6": { ...BEST, ms: -1 },
        "hiragana-katakana:both:3x4": "rápido",
        "chave:qualquer:3x4": BEST,
      })
    ).toEqual({ "kana-romaji:hiragana:3x4": BEST });
    expect(sanitizeSealsBests([BEST])).toEqual({});
  });

  it("JSON quebrado, outra versão ou armazenamento indisponível: padrões, sem lançar", () => {
    localStorage.setItem(KEY, "{quebrado");
    expect(loadSealsSettings()).toEqual(DEFAULT_SEALS_SETTINGS);
    localStorage.setItem(KEY, JSON.stringify({ version: 99, settings: { sizeId: "4x6" }, best: { "kana-romaji:hiragana:3x4": BEST } }));
    expect(loadSealsSettings()).toEqual(DEFAULT_SEALS_SETTINGS);
    expect(loadSealsBests()).toEqual({});

    vi.stubGlobal("localStorage", undefined);
    expect(loadSealsBests()).toEqual({});
    expect(saveSealsSettings(DEFAULT_SEALS_SETTINGS)).toBe(false);
  });

  it("quota cheia: devolve false e não perde o que já estava salvo", () => {
    vi.stubGlobal("localStorage", createMemoryStorage({ failOnSet: (value) => value.includes('"moves":6') }));
    saveSealsBestIfBetter("kana-romaji:hiragana:3x4", BEST);
    expect(saveSealsBestIfBetter("kana-romaji:hiragana:3x4", { ...BEST, moves: 6 })).toBe(false);
    expect(loadSealsBests()["kana-romaji:hiragana:3x4"]).toEqual(BEST);
  });
});
