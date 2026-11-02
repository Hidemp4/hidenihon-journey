import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_MASTERY,
  MASTERY_MAX_WEIGHT,
  MASTERY_MIN_WEIGHT,
  applyResult,
  applyResults,
  computeWeights,
  createMasteryRecord,
  createMasteryStore,
  loadMastery,
  sanitizeMastery,
  selectDueItems,
  summarizeMastery,
  trimMasteryItems,
  type MasteryRecord,
} from "./mastery";
import { createMemoryStorage } from "./test/memoryStorage";

const KEY = "hidenihon:dojo:mastery:v1";
const DAY = 86_400_000;

function record(overrides: Partial<MasteryRecord> = {}): MasteryRecord {
  return { ...createMasteryRecord(), ...overrides };
}

describe("applyResult", () => {
  it("conta vistos, acertos e sequência", () => {
    let current = createMasteryRecord();
    current = applyResult(current, { itemId: "hiragana:あ", outcome: "correct", ms: 500 }, 1_000);
    current = applyResult(current, { itemId: "hiragana:あ", outcome: "correct", ms: 500 }, 2_000);

    expect(current).toMatchObject({ seen: 2, correct: 2, streak: 2, lastSeenAt: 2_000 });

    current = applyResult(current, { itemId: "hiragana:あ", outcome: "wrong" }, 3_000);
    expect(current).toMatchObject({ seen: 3, correct: 2, streak: 0, lastSeenAt: 3_000 });
  });

  it("faz média móvel só dos tempos de acerto", () => {
    let current = applyResult(createMasteryRecord(), { itemId: "hiragana:あ", outcome: "correct", ms: 1_000 }, 1);
    expect(current.avgMs).toBe(1_000);

    current = applyResult(current, { itemId: "hiragana:あ", outcome: "correct", ms: 2_000 }, 2);
    expect(current.avgMs).toBe(1_300); // 70% do histórico + 30% do novo

    current = applyResult(current, { itemId: "hiragana:あ", outcome: "wrong", ms: 50 }, 3);
    expect(current.avgMs).toBe(1_300);

    current = applyResult(current, { itemId: "hiragana:あ", outcome: "correct", ms: Number.NaN }, 4);
    expect(current.avgMs).toBe(1_300);
  });

  it("com `schedule` (Pergaminhos), grava a nova caixa e o vencimento", () => {
    const next = applyResult(record({ box: 2 }), { itemId: "hiragana:あ", outcome: "correct", schedule: { box: 3, dueAt: 4 * DAY } }, DAY);
    expect(next).toMatchObject({ box: 3, dueAt: 4 * DAY, seen: 1, correct: 1 });

    const clamped = applyResult(record(), { itemId: "hiragana:あ", outcome: "correct", schedule: { box: 9.4, dueAt: DAY } }, DAY);
    expect(clamped.box).toBe(5);

    const broken = applyResult(record({ box: 2, dueAt: DAY }), { itemId: "hiragana:あ", outcome: "wrong", schedule: { box: 1, dueAt: Number.NaN } }, DAY);
    expect(broken).toMatchObject({ box: 2, dueAt: DAY });
  });

  it("não mexe na caixa nem na agenda (isso é do agendador dos Pergaminhos)", () => {
    const scheduled = record({ box: 3, dueAt: 5 * DAY });
    const next = applyResult(scheduled, { itemId: "hiragana:あ", outcome: "wrong" }, DAY);

    expect(next.box).toBe(3);
    expect(next.dueAt).toBe(5 * DAY);
  });
});

describe("applyResults", () => {
  it("aplica um lote e ignora ids fora do formato", () => {
    const state = applyResults(
      EMPTY_MASTERY,
      [
        { itemId: "hiragana:あ", outcome: "correct" },
        { itemId: "hiragana:あ", outcome: "wrong" },
        { itemId: "lixo", outcome: "correct" },
        { itemId: "katakana:ア", outcome: "correct" },
      ],
      10
    );

    expect(Object.keys(state.items).sort()).toEqual(["hiragana:あ", "katakana:ア"]);
    expect(state.items["hiragana:あ"]).toMatchObject({ seen: 2, correct: 1 });
  });

  it("é idempotente por sourceId (a mesma sessão não conta duas vezes)", () => {
    const results = [{ itemId: "hiragana:あ", outcome: "correct" as const }];
    const once = applyResults(EMPTY_MASTERY, results, 10, "sessao-1");
    const twice = applyResults(once, results, 20, "sessao-1");

    expect(twice).toBe(once);
    expect(twice.items["hiragana:あ"].seen).toBe(1);
    expect(applyResults(once, results, 20, "sessao-2").items["hiragana:あ"].seen).toBe(2);
  });

  it("lembra só os 50 lotes mais recentes", () => {
    let state = EMPTY_MASTERY;
    for (let index = 0; index < 60; index += 1) {
      state = applyResults(state, [{ itemId: "hiragana:あ", outcome: "correct" }], index, `s${index}`);
    }

    expect(state.recentSources).toHaveLength(50);
    expect(state.recentSources[0]).toBe("s59");
  });
});

describe("pesos", () => {
  it("item nunca visto fica fora do mapa; erro sobe, sequência de acertos acalma", () => {
    const weights = computeWeights({
      "hiragana:あ": record(),
      "hiragana:い": record({ seen: 4, correct: 0, streak: 0 }),
      "hiragana:う": record({ seen: 4, correct: 4, streak: 4 }),
      "hiragana:え": record({ seen: 4, correct: 2, streak: 0 }),
      "hiragana:お": record({ seen: 4, correct: 2, streak: 2 }),
    });

    expect(weights.has("hiragana:あ")).toBe(false);
    expect(weights.get("hiragana:い")).toBe(MASTERY_MAX_WEIGHT);
    expect(weights.get("hiragana:う")).toBe(MASTERY_MIN_WEIGHT);
    expect(weights.get("hiragana:え")).toBe(3);
    expect(weights.get("hiragana:お")).toBe(2);
  });
});

describe("vencimentos e resumo", () => {
  const items = {
    "hiragana:あ": record({ seen: 1, correct: 1, dueAt: 3 * DAY, box: 2 }),
    "hiragana:い": record({ seen: 2, correct: 1, dueAt: 1 * DAY, box: 4 }),
    "hiragana:う": record({ seen: 1, correct: 0, dueAt: 1 * DAY, box: 1 }),
    "hiragana:え": record({ seen: 3, correct: 3, dueAt: 9 * DAY }),
    "hiragana:お": record({ seen: 1, correct: 1, dueAt: null }),
  };

  it("lista só os vencidos, do mais atrasado para o menos (empate: caixa menor)", () => {
    expect(selectDueItems(items, 3 * DAY).map((item) => item.itemId)).toEqual(["hiragana:う", "hiragana:い", "hiragana:あ"]);
    expect(selectDueItems(items, 0)).toEqual([]);
  });

  it("item sem agenda (dueAt null) é novo, não vencido", () => {
    expect(selectDueItems(items, 100 * DAY).map((item) => item.itemId)).not.toContain("hiragana:お");
  });

  it("resume vistos, acerto e vencidos", () => {
    expect(summarizeMastery(items, 3 * DAY)).toEqual({ itemsSeen: 5, attempts: 8, correct: 6, accuracy: 75, due: 3 });
    expect(summarizeMastery({}, 0)).toEqual({ itemsSeen: 0, attempts: 0, correct: 0, accuracy: 0, due: 0 });
  });
});

describe("validação do disco", () => {
  it("campo inválido vira padrão sem descartar o item", () => {
    const state = sanitizeMastery({
      version: 1,
      items: {
        "hiragana:あ": { seen: 3, correct: 9, streak: -1, lastSeenAt: "ontem", box: 7, dueAt: Infinity, avgMs: 420 },
        "hiragana:い": { seen: "muitos", correct: 2, streak: 1, lastSeenAt: 5, box: 2.5, dueAt: 10, avgMs: -3 },
      },
    });

    expect(state.items["hiragana:あ"]).toEqual({
      seen: 3,
      correct: 3, // não pode passar de "vistos"
      streak: 0,
      lastSeenAt: null,
      box: 1,
      dueAt: null,
      avgMs: 420,
    });
    expect(state.items["hiragana:い"]).toEqual({ seen: 0, correct: 0, streak: 0, lastSeenAt: 5, box: 1, dueAt: 10, avgMs: null });
  });

  it("descarta ids estranhos, itens que não são objeto e versão diferente", () => {
    const state = sanitizeMastery({
      version: 1,
      items: { lixo: { seen: 1 }, "hiragana:う": 5, [`hiragana:${"x".repeat(80)}`]: { seen: 1 }, "katakana:ア": { seen: 1, correct: 1 } },
      recentSources: ["s1", 2, "s2"],
    });

    expect(Object.keys(state.items)).toEqual(["katakana:ア"]);
    expect(state.recentSources).toEqual(["s1", "s2"]);
    expect(sanitizeMastery({ version: 2, items: { "katakana:ア": { seen: 1 } } })).toEqual(EMPTY_MASTERY);
    expect(sanitizeMastery("{}")).toEqual(EMPTY_MASTERY);
    expect(sanitizeMastery(null)).toEqual(EMPTY_MASTERY);
  });

  it("corta pelos vistos mais recentemente", () => {
    const trimmed = trimMasteryItems(
      {
        "hiragana:あ": record({ lastSeenAt: 1 }),
        "hiragana:い": record({ lastSeenAt: 3 }),
        "hiragana:う": record({ lastSeenAt: null }),
        "hiragana:え": record({ lastSeenAt: 2 }),
      },
      2
    );

    expect(Object.keys(trimmed).sort()).toEqual(["hiragana:え", "hiragana:い"].sort());
  });
});

describe("masteryStore", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("usa o relógio injetado e persiste na chave hidenihon:dojo:mastery:v1", () => {
    const store = createMasteryStore({ clock: () => 42_000 });

    expect(store.recordResult("hiragana:あ", "correct", 600)).toBe(true);
    expect(store.getRecord("hiragana:あ")).toMatchObject({ seen: 1, correct: 1, lastSeenAt: 42_000, avgMs: 600 });

    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    expect(raw.version).toBe(1);
    expect(raw.items["hiragana:あ"].seen).toBe(1);
  });

  it("`now` explícito vence o relógio; lote com sourceId repetido não duplica", () => {
    const store = createMasteryStore({ clock: () => 1 });
    const results = [
      { itemId: "hiragana:あ", outcome: "correct" as const, ms: 400 },
      { itemId: "hiragana:い", outcome: "wrong" as const, ms: 900 },
    ];

    store.recordResults(results, { now: 7_000, sourceId: "s1" });
    store.recordResults(results, { now: 8_000, sourceId: "s1" });

    expect(store.getRecord("hiragana:あ")).toMatchObject({ seen: 1, lastSeenAt: 7_000 });
    expect(store.getSummary()).toEqual({ itemsSeen: 2, attempts: 2, correct: 1, accuracy: 50, due: 0 });
    expect(store.getWeights().get("hiragana:い")).toBe(MASTERY_MAX_WEIGHT);
  });

  it("getDueItems usa o relógio quando `now` não vem", () => {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, items: { "hiragana:あ": { seen: 1, correct: 1, box: 2, dueAt: DAY } } }));

    expect(createMasteryStore({ clock: () => DAY - 1 }).getDueItems()).toEqual([]);
    expect(createMasteryStore({ clock: () => DAY }).getDueItems()).toEqual([{ itemId: "hiragana:あ", dueAt: DAY, box: 2 }]);
  });

  it("com a quota cheia, regrava guardando menos itens (os mais recentes)", () => {
    const items = Object.fromEntries(
      Array.from({ length: 600 }, (_, index) => [`kanji:${String.fromCodePoint(0x4e00 + index)}`, record({ seen: 1, lastSeenAt: index })])
    );
    const initial = JSON.stringify({ version: 1, items });
    // Só aceita payloads com menos da metade do tamanho atual: força o corte até 200 itens.
    const storage = createMemoryStorage({ failOnSet: (value) => value.length > initial.length / 2 });
    storage.data.set(KEY, initial);
    vi.stubGlobal("localStorage", storage);

    const store = createMasteryStore({ clock: () => 10_000 });
    expect(store.recordResult("hiragana:あ", "correct")).toBe(true);

    const saved = loadMastery().items;
    expect(Object.keys(saved)).toHaveLength(200);
    expect(saved["hiragana:あ"]).toBeDefined(); // o recém-visto sobrevive ao corte
    expect(saved[`kanji:${String.fromCodePoint(0x4e00)}`]).toBeUndefined();
  });

  it("funciona (sem lançar) sem localStorage ou com JSON corrompido", () => {
    localStorage.setItem(KEY, "{não é json");
    const store = createMasteryStore({ clock: () => 1 });
    expect(store.getSummary().itemsSeen).toBe(0);

    vi.stubGlobal("localStorage", undefined);
    expect(store.recordResult("hiragana:あ", "correct")).toBe(false);
    expect(store.getDueItems()).toEqual([]);
    expect(store.getWeights().size).toBe(0);
  });
});
