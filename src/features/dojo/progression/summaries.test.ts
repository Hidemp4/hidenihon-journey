import { describe, expect, it } from "vitest";
import type { BrushAttempt } from "../activities/brush/types";
import type { DrawingScore } from "../activities/brush/scoring";
import type { ExamAnswer } from "../activities/exam/types";
import type { DojoAttempt, DojoDifficulty } from "../activities/reflexes/types";
import type { GradeEntry } from "../activities/scrolls/types";
import { getKanjiStudyItems } from "../shared/kanjiDeck";
import { getKanaStudyItems, type StudyItem } from "../shared/studyItem";
import { scoreMatch } from "./match";
import { brushSummary, examSummary, reflexesSummary, scrollsSummary, sealsSummary, speedScore } from "./summaries";

const HIRAGANA = getKanaStudyItems("hiragana");
const KANJI = getKanjiStudyItems();

function attempt(index: number, outcome: DojoAttempt["outcome"], completionMs: number, romaji = "a"): DojoAttempt {
  const item = HIRAGANA[index % HIRAGANA.length];
  return {
    id: `t${index}`,
    kana: item.char,
    romaji,
    answer: outcome === "correct" ? romaji : "x",
    alphabet: "hiragana",
    group: "hiragana:a",
    outcome,
    reactionMs: 200,
    completionMs,
    createdAt: "2026-11-06T12:00:00.000Z",
  };
}

function reflexes(attempts: DojoAttempt[], difficulty: DojoDifficulty = "genin") {
  return {
    id: "arena-1",
    attempts,
    settings: { alphabet: "hiragana" as const, mode: "quantity" as const, targetCount: 20, timeLimitSeconds: 60, difficulty, selectedGroupIds: [], focusMode: false },
  };
}

function examAnswer(item: StudyItem, outcome: ExamAnswer["outcome"], ms: number, index: number): ExamAnswer {
  return {
    question: { id: `exame:${index}`, item, direction: "kana-to-romaji", options: [], correctIndex: 0 },
    chosenIndex: outcome === "timeout" ? null : 0,
    outcome,
    ms,
  };
}

function drawingScore(score: number): DrawingScore {
  return { score, error: 0, coverage: 0, precision: 0, strokeError: 0, strokeCount: 1, expectedStrokes: 1 };
}

function brushAttempt(item: StudyItem, score: number | null, extra: Partial<BrushAttempt> = {}): BrushAttempt {
  return {
    card: { key: `pincel:${item.id}`, item, glyph: { char: item.char, strokes: [], numbers: [] } },
    mode: "trace",
    strokes: [],
    score: score == null ? null : drawingScore(score),
    corrections: 0,
    orderErrors: 0,
    grade: null,
    outcome: score == null ? null : "correct",
    ...extra,
  };
}

function scrollEntry(index: number, thinkMs: number): GradeEntry {
  const shownAt = 10_000 * index;
  return {
    card: { key: `c${index}`, item: HIRAGANA[index], isNew: false },
    grade: index % 3 === 0 ? "again" : "good",
    shownAt,
    flippedAt: shownAt + thinkMs,
    gradedAt: shownAt + thinkMs + 500,
    toBox: null,
    dueAt: null,
  };
}

describe("velocidade", () => {
  it("100 até o limite rápido, 0 a partir do lento, reta no meio", () => {
    const rule = { fullMs: 500, zeroMs: 1_500 };
    expect(speedScore(300, rule)).toBe(100);
    expect(speedScore(1_000, rule)).toBe(50);
    expect(speedScore(2_000, rule)).toBe(0);
    expect(speedScore(Number.NaN, rule)).toBe(0);
  });
});

describe("Arena de Reflexos", () => {
  it("75% precisão + 25% velocidade; a digitação de romaji longo é descontada", () => {
    // 20 respostas, 16 certas a 1000ms (velocidade 50): 0,75 × 80 + 0,25 × 50 = 72,5.
    const attempts = Array.from({ length: 20 }, (_, i) => attempt(i, i < 16 ? "correct" : "wrong", 1_000));
    const summary = reflexesSummary(reflexes(attempts), true);
    expect(summary.ranked?.performance).toBeCloseTo(72.5);
    expect(summary).toMatchObject({ items: 20, practiceXp: 16, completed: true });

    // "shi" a 1240ms vale o mesmo que "a" a 1000ms (2 letras a mais × 120ms).
    const long = reflexesSummary(reflexes([attempt(0, "correct", 1_240, "shi")]), true);
    const short = reflexesSummary(reflexes([attempt(0, "correct", 1_000, "a")]), true);
    expect(long.ranked?.performance).toBeCloseTo(short.ranked?.performance ?? -1);
  });

  it("dificuldade conta nas vitórias; menos de 50% de acerto dá metade do XP", () => {
    const attempts = Array.from({ length: 20 }, (_, i) => attempt(i, i < 8 ? "correct" : "timeout", 600));
    expect(reflexesSummary(reflexes(attempts, "jonin"), true).ranked?.difficulty).toBe(1.25);
    expect(reflexesSummary(reflexes(attempts, "chunin"), true).ranked?.difficulty).toBe(1.1);
    expect(reflexesSummary(reflexes(attempts), true).practiceXp).toBe(4); // 8 acertos × 1 × ½
  });

  it("variedade = kana diferentes; sair no meio não conclui", () => {
    const repeated = Array.from({ length: 20 }, (_, i) => attempt(i % 3, "correct", 400));
    const summary = reflexesSummary(reflexes(repeated), false);
    expect(summary.ranked?.distinct).toBe(3);
    expect(summary).toMatchObject({ finished: false, completed: false });
  });
});

describe("Exame Chunin", () => {
  it("85% precisão + 15% velocidade; 2 XP por acerto", () => {
    // 10 respostas, 8 certas a 1500ms (velocidade 100): 0,85 × 80 + 0,15 × 100 = 83.
    const answers = Array.from({ length: 10 }, (_, i) => examAnswer(HIRAGANA[i], i < 8 ? "correct" : "wrong", 1_500, i));
    const summary = examSummary({ id: "exame-1", review: false, mode: "round", answers }, true);
    expect(summary.ranked?.performance).toBeCloseTo(83);
    expect(summary).toMatchObject({ items: 10, practiceXp: 16, completed: true });
    expect(summary.ranked).toMatchObject({ distinct: 10, difficulty: 1 });
  });

  it("revisão dos erros: só XP; kanji e Relâmpago somam bônus", () => {
    const answers = Array.from({ length: 10 }, (_, i) => examAnswer(KANJI[i], "correct", 2_000, i));
    expect(examSummary({ id: "exame-2", review: true, mode: "round", answers }, true)).toMatchObject({ ranked: null, unrankedReason: "review", practiceXp: 20 });
    expect(examSummary({ id: "exame-3", review: false, mode: "lightning", answers }, true).ranked?.difficulty).toBeCloseTo(1.5); // 1,2 × 1,25
  });
});

describe("Selos", () => {
  it("eficiência = 100 × 1,6 × pares ÷ jogadas (até 100); 4 XP por par", () => {
    const pairs = ["a", "b", "c", "d", "e", "f"];
    expect(sealsSummary({ id: "mesa", pairType: "kana-romaji", matchedPairIds: pairs, moves: 12 }, true).ranked?.performance).toBeCloseTo(80);
    expect(sealsSummary({ id: "mesa", pairType: "kana-romaji", matchedPairIds: pairs, moves: 6 }, true).ranked?.performance).toBe(100);
    const summary = sealsSummary({ id: "mesa", pairType: "kanji-meaning", matchedPairIds: pairs, moves: 10 }, true);
    expect(summary).toMatchObject({ items: 6, practiceXp: 24, completed: true });
    expect(summary.ranked?.difficulty).toBe(1.25);
  });

  it("sem jogada nenhuma: desempenho 0", () => {
    expect(sealsSummary({ id: "mesa", pairType: "kana-romaji", matchedPairIds: [], moves: 0 }, false).ranked?.performance).toBe(0);
  });
});

describe("Pincel", () => {
  it("nota × 100 ÷ 85 (até 100); no Traçar, erro de ordem vale metade; XP proporcional à nota", () => {
    const attempts = [
      brushAttempt(HIRAGANA[0], 85),
      brushAttempt(HIRAGANA[1], 68),
      brushAttempt(HIRAGANA[2], 95),
      brushAttempt(HIRAGANA[3], 85, { orderErrors: 1, outcome: "wrong" }),
      brushAttempt(HIRAGANA[4], 51),
    ];
    const summary = brushSummary({ id: "pincel-1", mode: "trace", attempts }, true);
    // 100, 80, 100, 50, 60 → média 78.
    expect(summary.ranked?.performance).toBeCloseTo(78);
    expect(summary).toMatchObject({ items: 5, completed: true, practiceXp: Math.round((8 * (85 + 68 + 95 + 85 + 51)) / 100) });
  });

  it("De memória: o erro de ordem não entra (o acerto é autoavaliado); kanji + De memória = teto 1,5", () => {
    const attempts = [brushAttempt(KANJI[0], 85, { mode: "recall", orderErrors: 2, grade: "again", outcome: "wrong" })];
    const summary = brushSummary({ id: "pincel-2", mode: "recall", attempts }, true);
    expect(summary.ranked?.performance).toBe(100);
    expect(summary.ranked?.difficulty).toBeCloseTo(1.5625);
    expect(scoreMatch({ ...summary, items: 10 }, 0)).toMatchObject({ factors: { difficulty: 1.5 } });
  });

  it("Estudar ordem: sem troféus nem XP", () => {
    const attempts = [brushAttempt(HIRAGANA[0], null, { mode: "study" }), brushAttempt(HIRAGANA[1], null, { mode: "study" })];
    expect(brushSummary({ id: "pincel-3", mode: "study", attempts }, true)).toMatchObject({ items: 0, practiceXp: 0, completed: false, ranked: null, unrankedReason: "study" });
  });
});

describe("Pergaminhos", () => {
  it("2 XP por carta, qualquer nota; carta virada em menos de 1s não conta; nunca vale troféus", () => {
    const history = [scrollEntry(0, 3_000), scrollEntry(1, 1_000), scrollEntry(2, 300), scrollEntry(3, 2_000), scrollEntry(4, 4_000), scrollEntry(5, 1_500)];
    const summary = scrollsSummary({ id: "rolo", queue: [], history });
    expect(summary).toMatchObject({ items: 6, practiceXp: 10, finished: true, completed: true, ranked: null, unrankedReason: "self-graded" });
  });

  it("a conclusão pede 5 cartas que contaram e a fila vazia", () => {
    const quick = [0, 1, 2, 3, 4, 5].map((i) => scrollEntry(i, 200));
    expect(scrollsSummary({ id: "rolo", queue: [], history: quick })).toMatchObject({ practiceXp: 0, completed: false });
    const history = [0, 1, 2, 3, 4].map((i) => scrollEntry(i, 2_000));
    expect(scrollsSummary({ id: "rolo", queue: [history[0].card], history })).toMatchObject({ finished: false, completed: false });
  });
});
