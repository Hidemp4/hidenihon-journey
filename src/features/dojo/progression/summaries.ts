import type { BrushSession } from "../activities/brush/types";
import type { ExamRun } from "../activities/exam/types";
import type { DojoSession } from "../activities/reflexes/types";
import type { ScrollSession } from "../activities/scrolls/types";
import type { SealsBoard } from "../activities/seals/types";
import type { SessionSummary } from "./match";
import {
  BRUSH_FULL_SCORE,
  BRUSH_ORDER_ERROR_FACTOR,
  DIFFICULTY_BONUS,
  EXAM_ACCURACY_WEIGHT,
  EXAM_SPEED,
  LOW_ACCURACY,
  PRACTICE_XP,
  RANKED_ACTIVITIES,
  REFLEXES_ACCURACY_WEIGHT,
  REFLEXES_SPEED,
  REFLEXES_TYPING_MS_PER_EXTRA_CHAR,
  SCROLLS_MIN_CARDS,
  SEALS_PERFECT_MOVES_PER_PAIR,
} from "./rules";

/*
 * Cada atividade vira um `SessionSummary`: volume, XP de prática e, quando vale troféus, o
 * desempenho de 0 a 100 (REGRAS.md, seções 3 e 5). Tudo puro: recebe a sessão, devolve números.
 */

function mean(values: readonly number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** 100 até `fullMs`, 0 a partir de `zeroMs`, linha reta no meio. */
export function speedScore(ms: number, { fullMs, zeroMs }: { fullMs: number; zeroMs: number }) {
  if (!Number.isFinite(ms)) return 0;
  return Math.min(100, Math.max(0, ((zeroMs - ms) / (zeroMs - fullMs)) * 100));
}

/** Arena e Exame: com menos de 50% de precisão, metade do XP de prática. */
function practiceXpFor(xp: number, accuracy: number) {
  return Math.round(accuracy < LOW_ACCURACY.threshold ? xp * LOW_ACCURACY.factor : xp);
}

const product = (values: readonly number[]) => values.reduce((total, value) => total * value, 1);

/* ---------- Arena de Reflexos ---------- */

export function reflexesSummary(session: Pick<DojoSession, "id" | "settings" | "attempts">, finished: boolean): SessionSummary {
  const { attempts } = session;
  const correct = attempts.filter((attempt) => attempt.outcome === "correct");
  const accuracy = attempts.length === 0 ? 0 : correct.length / attempts.length;
  // A régua de velocidade desconta a digitação: "shi" e "a" medem a mesma reação.
  const speed = mean(
    correct.map((attempt) =>
      speedScore(attempt.completionMs - Math.max(0, attempt.romaji.length - 1) * REFLEXES_TYPING_MS_PER_EXTRA_CHAR, REFLEXES_SPEED)
    )
  );

  return {
    activity: "reflexes",
    sessionId: session.id,
    finished,
    items: attempts.length,
    practiceXp: practiceXpFor(correct.length * PRACTICE_XP.reflexesCorrect, accuracy),
    completed: finished && attempts.length >= RANKED_ACTIVITIES.reflexes.minItems,
    ranked: {
      activity: "reflexes",
      performance: REFLEXES_ACCURACY_WEIGHT * accuracy * 100 + (1 - REFLEXES_ACCURACY_WEIGHT) * speed,
      distinct: new Set(attempts.map((attempt) => `${attempt.alphabet}:${attempt.kana}`)).size,
      difficulty: DIFFICULTY_BONUS.reflexes[session.settings.difficulty] ?? 1,
    },
  };
}

/* ---------- Exame Chunin ---------- */

export function examSummary(run: Pick<ExamRun, "id" | "review" | "mode" | "answers">, finished: boolean): SessionSummary {
  const { answers } = run;
  const correct = answers.filter((answer) => answer.outcome === "correct");
  const accuracy = answers.length === 0 ? 0 : correct.length / answers.length;
  const kanji = answers.some((answer) => answer.question.item.kind === "kanji");

  return {
    activity: "exam",
    sessionId: run.id,
    finished,
    items: answers.length,
    practiceXp: practiceXpFor(correct.length * PRACTICE_XP.examCorrect, accuracy),
    completed: finished && answers.length >= RANKED_ACTIVITIES.exam.minItems,
    // A revisão dos erros tende a 100%: só XP.
    ranked: run.review
      ? null
      : {
          activity: "exam",
          performance: EXAM_ACCURACY_WEIGHT * accuracy * 100 + (1 - EXAM_ACCURACY_WEIGHT) * mean(correct.map((answer) => speedScore(answer.ms, EXAM_SPEED))),
          distinct: new Set(answers.map((answer) => answer.question.item.id)).size,
          difficulty: product([DIFFICULTY_BONUS.exam[run.mode] ?? 1, kanji ? DIFFICULTY_BONUS.kanji : 1]),
        },
    unrankedReason: run.review ? "review" : undefined,
  };
}

/* ---------- Selos ---------- */

export function sealsSummary(board: Pick<SealsBoard, "id" | "pairType" | "matchedPairIds" | "moves">, finished: boolean): SessionSummary {
  const pairs = board.matchedPairIds.length;
  const efficiency = board.moves === 0 ? 0 : Math.min(100, (100 * SEALS_PERFECT_MOVES_PER_PAIR * pairs) / board.moves);

  return {
    activity: "seals",
    sessionId: board.id,
    finished,
    items: pairs,
    practiceXp: pairs * PRACTICE_XP.sealsPair,
    completed: finished && pairs >= RANKED_ACTIVITIES.seals.minItems,
    ranked: {
      activity: "seals",
      performance: efficiency,
      distinct: pairs,
      difficulty: board.pairType === "kanji-meaning" ? DIFFICULTY_BONUS.kanji : 1,
    },
  };
}

/* ---------- Pincel ---------- */

export function brushSummary(session: Pick<BrushSession, "id" | "mode" | "attempts">, finished: boolean): SessionSummary {
  // Só o que foi desenhado e avaliado (Estudar ordem não tem nota).
  const drawn = session.attempts.filter((attempt) => attempt.outcome != null && attempt.score != null);
  const scores = drawn.map((attempt) => attempt.score?.score ?? 0);
  const study = session.mode === "study";
  const kanji = drawn.some((attempt) => attempt.card.item.kind === "kanji");

  return {
    activity: "brush",
    sessionId: session.id,
    finished,
    items: drawn.length,
    practiceXp: Math.round(scores.reduce((sum, score) => sum + (PRACTICE_XP.brushMax * score) / 100, 0)),
    completed: !study && finished && drawn.length >= RANKED_ACTIVITIES.brush.minItems,
    ranked: study
      ? null
      : {
          activity: "brush",
          performance: mean(
            drawn.map((attempt) => {
              const value = Math.min(100, ((attempt.score?.score ?? 0) * 100) / BRUSH_FULL_SCORE);
              // No Traçar a ordem é conferida pelo app; De memória o acerto é autoavaliado e não entra.
              return session.mode === "trace" && attempt.orderErrors > 0 ? value * BRUSH_ORDER_ERROR_FACTOR : value;
            })
          ),
          distinct: new Set(drawn.map((attempt) => attempt.card.item.id)).size,
          difficulty: product([session.mode === "recall" ? DIFFICULTY_BONUS.brushRecall : 1, kanji ? DIFFICULTY_BONUS.kanji : 1]),
        },
    unrankedReason: study ? "study" : undefined,
  };
}

/* ---------- Pergaminhos ---------- */

/** Autoavaliados: só XP, e o XP não depende da nota (marcar "Fácil" sem saber não rende nada). */
export function scrollsSummary(session: Pick<ScrollSession, "id" | "queue" | "history">): SessionSummary {
  const counted = session.history.filter((entry) => entry.flippedAt - entry.shownAt >= PRACTICE_XP.scrollsMinThinkMs).length;
  const finished = session.queue.length === 0;

  return {
    activity: "scrolls",
    sessionId: session.id,
    finished,
    items: session.history.length,
    practiceXp: counted * PRACTICE_XP.scrollsCard,
    completed: finished && counted >= SCROLLS_MIN_CARDS,
    ranked: null,
    unrankedReason: "self-graded",
  };
}
