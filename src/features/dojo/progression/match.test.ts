import { describe, expect, it } from "vitest";
import { createRng } from "../shared/components/arena/rng";
import { scoreMatch, type RankedInput, type SessionSummary } from "./match";
import { standingFor } from "./ladder";

function exam(performance: number, overrides: Partial<SessionSummary> = {}, ranked: Partial<RankedInput> = {}) {
  return {
    finished: true,
    items: 20,
    ranked: { activity: "exam" as const, performance, distinct: 15, difficulty: 1, ...ranked },
    ...overrides,
  };
}

function trophiesOf(result: ReturnType<typeof scoreMatch>) {
  if ("reason" in result) throw new Error(`não ranqueada: ${result.reason}`);
  return result.trophies;
}

describe("partida", () => {
  it("o exemplo do REGRAS.md: Ouro II (950, meta 68) — 88 dá +26, 60 dá −16", () => {
    expect(scoreMatch(exam(88), 950)).toMatchObject({ ranked: true, outcome: "win", trophies: 26, meta: 68, performance: 88 });
    expect(scoreMatch(exam(60), 950)).toMatchObject({ ranked: true, outcome: "loss", trophies: -16 });
  });

  it("vitória na meta, empate até 3 abaixo, derrota abaixo disso", () => {
    // 950 troféus: meta 68.
    expect(scoreMatch(exam(68), 950)).toMatchObject({ outcome: "win", trophies: 20 });
    expect(scoreMatch(exam(67), 950)).toMatchObject({ outcome: "draw", trophies: 0 });
    expect(scoreMatch(exam(65), 950)).toMatchObject({ outcome: "draw", trophies: 0 });
    expect(scoreMatch(exam(64), 950)).toMatchObject({ outcome: "loss" });
    expect(scoreMatch(exam(100), 950)).toMatchObject({ outcome: "win", trophies: 30 });
  });

  it("derrota: 15 + até 10 pela distância; Bronze perde metade e Prata três quartos", () => {
    expect(scoreMatch(exam(0), 950)).toMatchObject({ outcome: "loss", trophies: -25 });
    expect(scoreMatch(exam(0), 150)).toMatchObject({ outcome: "loss", trophies: -13 }); // 25 × ½ = 12,5
    expect(scoreMatch(exam(0), 500)).toMatchObject({ outcome: "loss", trophies: -19 }); // 25 × ¾ = 18,75
  });

  it("os troféus nunca ficam negativos (a derrota no 0 conta, mas não tira nada)", () => {
    expect(scoreMatch(exam(0), 5)).toMatchObject({ outcome: "loss", trophies: -5 });
    const atZero = scoreMatch(exam(0), 0);
    expect(atZero).toMatchObject({ outcome: "loss" });
    expect(Object.is(trophiesOf(atZero), 0)).toBe(true);
  });

  it("volume: sessão maior vale mais (0,5 a 1,5) e também pesa nas derrotas", () => {
    expect(trophiesOf(scoreMatch(exam(68, { items: 10 }), 950))).toBe(10);
    expect(trophiesOf(scoreMatch(exam(68, { items: 30 }), 950))).toBe(30);
    expect(trophiesOf(scoreMatch(exam(68, { items: 300 }), 950))).toBe(30);
    expect(trophiesOf(scoreMatch(exam(0, { items: 30 }), 950))).toBe(-30); // 25 × 1,5 = 37,5 → teto 30
  });

  it("variedade e dificuldade só nas vitórias; dificuldade com teto de ×1,5; vitória até +45", () => {
    expect(trophiesOf(scoreMatch(exam(68, {}, { distinct: 2 }), 950))).toBe(5); // 20 × 0,25
    expect(trophiesOf(scoreMatch(exam(0, {}, { distinct: 2 }), 950))).toBe(-25);
    expect(trophiesOf(scoreMatch(exam(68, {}, { difficulty: 1.2 }), 950))).toBe(24);
    expect(trophiesOf(scoreMatch(exam(68, {}, { difficulty: 3 }), 950))).toBe(30);
    expect(trophiesOf(scoreMatch(exam(0, {}, { difficulty: 3 }), 950))).toBe(-25);
    expect(trophiesOf(scoreMatch(exam(100, { items: 40 }, { difficulty: 1.5 }), 950))).toBe(45);
  });

  it("sair no meio nunca vence (vira empate), mas a derrota continua valendo", () => {
    expect(scoreMatch(exam(100, { finished: false }), 950)).toMatchObject({ outcome: "draw", trophies: 0 });
    expect(scoreMatch(exam(30, { finished: false }), 950)).toMatchObject({ outcome: "loss" });
  });

  it("não vale troféus: abaixo do mínimo da atividade ou atividade sem partida", () => {
    expect(scoreMatch(exam(100, { items: 9 }), 950)).toEqual({ ranked: false, reason: "too-short" });
    expect(scoreMatch({ finished: true, items: 50, ranked: null, unrankedReason: "self-graded" }, 950)).toEqual({ ranked: false, reason: "self-graded" });
    expect(scoreMatch({ finished: true, items: 50, ranked: null, unrankedReason: "review" }, 950)).toEqual({ ranked: false, reason: "review" });
    // Selos: 6 pares é o mínimo (a menor mesa).
    expect(scoreMatch({ finished: true, items: 6, ranked: { activity: "seals", performance: 90, distinct: 1, difficulty: 1 } }, 0)).toMatchObject({ ranked: true, outcome: "win" });
  });
});

describe("equilíbrio (a tabela do REGRAS.md)", () => {
  /** Desempenho médio `mu` variando ±7 (normal), Exames de 20 perguntas, semente fixa. */
  function simulate(mu: number, sessions: number, runs = 40) {
    const results: number[] = [];
    for (let run = 0; run < runs; run += 1) {
      const rng = createRng(1_000 * mu + run);
      const normal = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
      let trophies = 0;
      for (let session = 0; session < sessions; session += 1) {
        const performance = Math.max(0, Math.min(100, Math.round(mu + 7 * normal())));
        const result = scoreMatch(exam(performance), trophies);
        if (result.ranked) trophies = Math.max(0, trophies + result.trophies);
      }
      results.push(trophies);
    }
    results.sort((a, b) => a - b);
    return results[Math.floor(results.length / 2)];
  }

  it("cada faixa de desempenho para na liga da tabela", () => {
    const league = (mu: number) => standingFor(simulate(mu, 800)).league.name;
    expect(league(60)).toBe("Prata");
    expect(league(80)).toBe("Diamante");
    expect(league(85)).toBe("Imortal");
    expect(league(90)).toBe("Titã");
    expect(league(93)).toBe("Lendário");
  });

  it("subir é mais lento lá em cima: com 93% ainda não se chega ao Lendário em 100 partidas", () => {
    expect(standingFor(simulate(93, 100)).league.name).toBe("Diamante");
  });
});
