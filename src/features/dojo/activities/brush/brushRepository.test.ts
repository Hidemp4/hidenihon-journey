import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "@/features/dojo/shared/test/memoryStorage";
import { DEFAULT_BRUSH_SETTINGS } from "./constants";
import { loadBrushSettings, loadPracticed, recordPracticed, sanitizeBrushSettings, sanitizePracticed, saveBrushSettings } from "./brushRepository";

const KEY = "hidenihon:dojo:brush:v1";

describe("repositório do Pincel", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("guarda configurações e praticados na chave hidenihon:dojo:brush:v1, sem um apagar o outro", () => {
    saveBrushSettings({ mode: "recall", content: "kana", alphabet: "katakana", selectedGroupIds: ["katakana:ka-ka-row"], sessionSize: 10 });
    recordPracticed([{ itemId: "katakana:カ", score: 81.6 }], 5);

    expect(loadBrushSettings()).toEqual({ mode: "recall", content: "kana", alphabet: "katakana", selectedGroupIds: ["katakana:ka-ka-row"], sessionSize: 10 });
    expect(loadPracticed()).toEqual({ "katakana:カ": { bestScore: 82, lastAt: 5 } });
    expect(JSON.parse(localStorage.getItem(KEY) ?? "null").version).toBe(1);
  });

  it("fica a melhor nota e a data mais recente; regravar a mesma sessão não muda nada", () => {
    recordPracticed([{ itemId: "hiragana:あ", score: 70 }], 10);
    recordPracticed([{ itemId: "hiragana:あ", score: 40 }], 20);
    recordPracticed([{ itemId: "hiragana:あ", score: 40 }], 20);
    expect(loadPracticed()).toEqual({ "hiragana:あ": { bestScore: 70, lastAt: 20 } });
    expect(recordPracticed([], 1)).toBe(true);
  });

  it("configuração inválida vira padrão, campo a campo", () => {
    expect(sanitizeBrushSettings({ mode: "voar", alphabet: "klingon", selectedGroupIds: "todos", sessionSize: 7 })).toEqual(DEFAULT_BRUSH_SETTINGS);
    expect(sanitizeBrushSettings({ mode: "study", alphabet: "hiragana", selectedGroupIds: ["hiragana:ka-row", "katakana:ka-ka-row", 3], sessionSize: 20 })).toEqual({
      mode: "study",
      content: "kana",
      alphabet: "hiragana",
      selectedGroupIds: ["hiragana:ka-row"],
      sessionSize: 20,
    });
  });

  it("conteúdo kanji valida os grupos contra os temas; conteúdo desconhecido vira kana", () => {
    expect(sanitizeBrushSettings({ content: "kanji", selectedGroupIds: ["kanji:actions", "hiragana:ka-row"] })).toMatchObject({
      content: "kanji",
      selectedGroupIds: ["kanji:actions"],
    });
    expect(sanitizeBrushSettings({ content: "hanzi" }).content).toBe("kana");
  });

  it("praticado inválido é descartado; acima do limite saem os mais antigos", () => {
    expect(
      sanitizePracticed({
        "hiragana:あ": { bestScore: 90, lastAt: 1 },
        "hiragana:い": { bestScore: 101, lastAt: 1 },
        "hiragana:う": { bestScore: 50 },
        "lixo:x": { bestScore: 50, lastAt: 1 },
        "katakana:ア": "ótimo",
      })
    ).toEqual({ "hiragana:あ": { bestScore: 90, lastAt: 1 } });

    const many = Object.fromEntries(Array.from({ length: 600 }, (_, index) => [`kanji:${index}`, { bestScore: 50, lastAt: index }]));
    const trimmed = sanitizePracticed(many);
    expect(Object.keys(trimmed)).toHaveLength(500);
    expect(trimmed["kanji:599"]).toBeDefined();
    expect(trimmed["kanji:0"]).toBeUndefined();
  });

  it("quota cheia: tenta de novo com menos praticados (os mais recentes ficam)", () => {
    vi.stubGlobal("localStorage", createMemoryStorage({ failOnSet: (value) => value.length > 4_000 }));
    const entries = Array.from({ length: 300 }, (_, index) => ({ itemId: `kanji:${index}`, score: 50 }));
    expect(recordPracticed(entries, 1)).toBe(true);
    const saved = loadPracticed();
    expect(Object.keys(saved).length).toBeLessThanOrEqual(50);
    expect(Object.keys(saved).length).toBeGreaterThan(0);
  });

  it("JSON quebrado, outra versão ou armazenamento indisponível: padrões, sem lançar", () => {
    localStorage.setItem(KEY, "{quebrado");
    expect(loadBrushSettings()).toEqual(DEFAULT_BRUSH_SETTINGS);
    localStorage.setItem(KEY, JSON.stringify({ version: 2, settings: { mode: "study" }, practiced: { "hiragana:あ": { bestScore: 1, lastAt: 1 } } }));
    expect(loadBrushSettings()).toEqual(DEFAULT_BRUSH_SETTINGS);
    expect(loadPracticed()).toEqual({});

    vi.stubGlobal("localStorage", undefined);
    expect(loadPracticed()).toEqual({});
    expect(recordPracticed([{ itemId: "hiragana:あ", score: 1 }], 1)).toBe(false);
  });
});
