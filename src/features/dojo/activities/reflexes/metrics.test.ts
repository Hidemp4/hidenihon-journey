import { describe, expect, it } from "vitest";
import { calculateDojoStats, countCurrentCombo, getComboGoal, getPerformanceLabel } from "./metrics";
import type { AttemptOutcome, DojoAttempt } from "./types";

let counter = 0;
function attempt(kana: string, outcome: AttemptOutcome, completionMs: number, reactionMs: number | null = 200): DojoAttempt {
  counter += 1;
  return {
    id: `a-${counter}`,
    kana,
    romaji: kana,
    answer: outcome === "timeout" ? "" : kana,
    alphabet: "hiragana",
    group: "hiragana:a",
    outcome,
    reactionMs,
    completionMs,
    createdAt: new Date(0).toISOString(),
  };
}

describe("calculateDojoStats", () => {
  it("retorna valores neutros para lista vazia", () => {
    const stats = calculateDojoStats([]);

    expect(stats.total).toBe(0);
    expect(stats.accuracy).toBe(0);
    expect(stats.averageCompletionMs).toBeNull();
    expect(stats.medianCompletionMs).toBeNull();
    expect(stats.fastestCompletionMs).toBeNull();
    expect(stats.weakKana).toEqual([]);
  });

  it("calcula velocidade só com acertos (erros e timeouts não distorcem)", () => {
    const stats = calculateDojoStats([
      attempt("a", "correct", 400),
      attempt("i", "correct", 600),
      attempt("u", "wrong", 50),
      attempt("e", "timeout", 5_000, null),
    ]);

    expect(stats.total).toBe(4);
    expect(stats.correct).toBe(2);
    expect(stats.wrong).toBe(1);
    expect(stats.timeouts).toBe(1);
    expect(stats.accuracy).toBe(50);
    expect(stats.averageCompletionMs).toBe(500);
    expect(stats.fastestCompletionMs).toBe(400);
  });

  it("calcula mediana para quantidade ímpar e par de acertos", () => {
    const odd = calculateDojoStats([attempt("a", "correct", 300), attempt("i", "correct", 900), attempt("u", "correct", 500)]);
    const even = calculateDojoStats([attempt("a", "correct", 300), attempt("i", "correct", 500)]);

    expect(odd.medianCompletionMs).toBe(500);
    expect(even.medianCompletionMs).toBe(400);
  });

  it("só lista como fraco quem realmente errou, do pior para o melhor", () => {
    const stats = calculateDojoStats([
      attempt("a", "correct", 300),
      attempt("i", "wrong", 300),
      attempt("i", "wrong", 300),
      attempt("u", "correct", 300),
      attempt("u", "timeout", 5_000),
    ]);

    expect(stats.weakKana.map((item) => item.kana)).toEqual(["i", "u"]);
    expect(stats.weakKana[0]).toMatchObject({ accuracy: 0, misses: 2, averageCompletionMs: null });
  });

  it("deixa weakKana vazio com 100% de acerto", () => {
    expect(calculateDojoStats([attempt("a", "correct", 300), attempt("i", "correct", 400)]).weakKana).toEqual([]);
  });
});

describe("getPerformanceLabel", () => {
  it("desconta o tempo de digitação das letras extras", () => {
    expect(getPerformanceLabel(380, 1)).toBe("Instantâneo");
    expect(getPerformanceLabel(620, 3)).toBe("Instantâneo"); // 620 - 2*120 = 380
    expect(getPerformanceLabel(620, 1)).toBe("Melhorando");
    expect(getPerformanceLabel(null)).toBe("Sem resposta");
    expect(getPerformanceLabel(2_000)).toBe("Treinar mais");
  });
});

describe("combo", () => {
  it("conta acertos consecutivos no fim da lista", () => {
    const list = [attempt("a", "correct", 1), attempt("i", "wrong", 1), attempt("u", "correct", 1), attempt("e", "correct", 1)];

    expect(countCurrentCombo(list)).toBe(2);
    expect(countCurrentCombo([...list, attempt("o", "timeout", 5_000)])).toBe(0);
  });

  it("limita a meta entre 3 e 10", () => {
    expect(getComboGoal(0)).toBe(3);
    expect(getComboGoal(10)).toBe(6);
    expect(getComboGoal(100)).toBe(10);
  });
});
