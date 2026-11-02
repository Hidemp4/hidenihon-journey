import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "@/features/dojo/shared/test/memoryStorage";
import { DEFAULT_SCROLLS_SETTINGS } from "./constants";
import {
  loadIntroducedToday,
  loadScrollsSettings,
  recordIntroduced,
  sanitizeScrollsSettings,
  saveScrollsSettings,
} from "./scrollsRepository";

const KEY = "hidenihon:dojo:scrolls:v1";

describe("repositório dos Pergaminhos", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("guarda configurações na chave hidenihon:dojo:scrolls:v1", () => {
    saveScrollsSettings({ ...DEFAULT_SCROLLS_SETTINGS, content: "kanji", newPerDay: 20 });

    expect(loadScrollsSettings()).toMatchObject({ content: "kanji", newPerDay: 20 });
    expect(JSON.parse(localStorage.getItem(KEY) ?? "null").version).toBe(1);
  });

  it("valor inválido vira padrão, campo a campo", () => {
    expect(
      sanitizeScrollsSettings({ alphabet: "klingon", direction: "de-lado", newPerDay: 7, selectedGroupIds: ["katakana:ka-a-row", "nada", 3] })
    ).toEqual(DEFAULT_SCROLLS_SETTINGS);
    expect(sanitizeScrollsSettings({ alphabet: "katakana", newPerDay: 5, selectedGroupIds: ["katakana:ka-a-row", "hiragana:a-row"] })).toMatchObject({
      alphabet: "katakana",
      newPerDay: 5,
      selectedGroupIds: ["katakana:ka-a-row"], // grupo de outro alfabeto sai
    });
    expect(sanitizeScrollsSettings(null)).toEqual(DEFAULT_SCROLLS_SETTINGS);
    // Conteúdo: kanji valida os grupos contra os temas de kanji; conteúdo desconhecido vira kana.
    expect(sanitizeScrollsSettings({ content: "kanji", selectedGroupIds: ["kanji:body", "hiragana:a-row"] })).toMatchObject({
      content: "kanji",
      selectedGroupIds: ["kanji:body"],
    });
    expect(sanitizeScrollsSettings({ content: "hanzi" }).content).toBe("kana");
    // A direção virou fixa: a de configurações antigas é descartada (não aparece mais no objeto).
    expect(sanitizeScrollsSettings({ direction: "romaji-to-kana", newPerDay: 20 })).toEqual({ ...DEFAULT_SCROLLS_SETTINGS, newPerDay: 20 });
  });

  it("conta novos por dia local, zera quando o dia vira e não conta a mesma sessão duas vezes", () => {
    recordIntroduced(100, "s1", 4);
    recordIntroduced(100, "s1", 4);
    recordIntroduced(100, "s2", 3);

    expect(loadIntroducedToday(100)).toBe(7);
    expect(loadIntroducedToday(101)).toBe(0);

    recordIntroduced(101, "s3", 2);
    expect(loadIntroducedToday(101)).toBe(2);
    expect(loadIntroducedToday(100)).toBe(0); // só o dia mais recente fica guardado
  });

  it("salvar configuração não apaga o contador do dia", () => {
    recordIntroduced(100, "s1", 5);
    saveScrollsSettings({ ...DEFAULT_SCROLLS_SETTINGS, newPerDay: 5 });
    expect(loadIntroducedToday(100)).toBe(5);
  });

  it("ignora JSON corrompido, versão diferente e contador estragado", () => {
    localStorage.setItem(KEY, "{nao é json");
    expect(loadScrollsSettings()).toEqual(DEFAULT_SCROLLS_SETTINGS);

    localStorage.setItem(KEY, JSON.stringify({ version: 2, settings: { newPerDay: 20 } }));
    expect(loadScrollsSettings().newPerDay).toBe(10);

    localStorage.setItem(KEY, JSON.stringify({ version: 1, daily: { day: "hoje", introduced: -3 } }));
    expect(loadIntroducedToday(100)).toBe(0);
  });

  it("sem localStorage ou com a quota cheia não lança", () => {
    vi.stubGlobal("localStorage", createMemoryStorage({ failOnSet: () => true }));
    expect(saveScrollsSettings(DEFAULT_SCROLLS_SETTINGS)).toBe(false);
    expect(recordIntroduced(1, "s", 1)).toBe(false);

    vi.stubGlobal("localStorage", undefined);
    expect(loadScrollsSettings()).toEqual(DEFAULT_SCROLLS_SETTINGS);
    expect(loadIntroducedToday(1)).toBe(0);
  });
});
