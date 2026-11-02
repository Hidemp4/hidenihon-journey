import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "@/features/dojo/shared/test/memoryStorage";
import { DEFAULT_EXAM_SETTINGS } from "./constants";
import { loadExamSettings, loadLastExamResult, sanitizeExamSettings, saveExamSettings, saveLastExamResult } from "./examRepository";

const KEY = "hidenihon:dojo:exam:v1";

describe("repositório do Exame", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("guarda configurações e a última nota na chave hidenihon:dojo:exam:v1, sem uma apagar a outra", () => {
    saveExamSettings({ ...DEFAULT_EXAM_SETTINGS, mode: "lightning", timeLimitSeconds: 3, autoAdvance: true });
    saveLastExamResult({ score: 70, total: 20, mode: "lightning", finishedAt: 5 });

    expect(loadExamSettings()).toMatchObject({ mode: "lightning", timeLimitSeconds: 3, autoAdvance: true });
    expect(loadLastExamResult()).toEqual({ score: 70, total: 20, mode: "lightning", finishedAt: 5 });
    expect(JSON.parse(localStorage.getItem(KEY) ?? "null").version).toBe(1);
  });

  it("valor inválido vira padrão, campo a campo", () => {
    expect(
      sanitizeExamSettings({
        alphabet: "klingon",
        direction: "de-lado",
        mode: "hokage",
        questionCount: 7,
        timeLimitSeconds: 0,
        autoAdvance: "sim",
        selectedGroupIds: ["katakana:ka-a-row", 3],
      })
    ).toEqual(DEFAULT_EXAM_SETTINGS);
    expect(sanitizeExamSettings({ mode: "survival", questionCount: 30 })).toMatchObject({ mode: "survival", questionCount: 30 });
  });

  it("ignora última nota estragada, JSON corrompido e versão diferente", () => {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, last: { score: 140, total: 10, mode: "round", finishedAt: 1 } }));
    expect(loadLastExamResult()).toBeNull();
    localStorage.setItem(KEY, JSON.stringify({ version: 1, last: { score: 50, total: 10, mode: "duelo", finishedAt: 1 } }));
    expect(loadLastExamResult()).toBeNull();
    localStorage.setItem(KEY, "{nao é json");
    expect(loadExamSettings()).toEqual(DEFAULT_EXAM_SETTINGS);
    localStorage.setItem(KEY, JSON.stringify({ version: 9, settings: { mode: "survival" } }));
    expect(loadExamSettings().mode).toBe("round");
  });

  it("sem localStorage ou com a quota cheia não lança", () => {
    vi.stubGlobal("localStorage", createMemoryStorage({ failOnSet: () => true }));
    expect(saveExamSettings(DEFAULT_EXAM_SETTINGS)).toBe(false);
    vi.stubGlobal("localStorage", undefined);
    expect(loadLastExamResult()).toBeNull();
    expect(saveLastExamResult({ score: 1, total: 1, mode: "round", finishedAt: 1 })).toBe(false);
  });
});
