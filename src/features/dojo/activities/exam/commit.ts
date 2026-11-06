import { recordActivity } from "@/features/dojo/shared/activityLog";
import { masteryStore, type MasteryResult } from "@/features/dojo/shared/mastery";
import { recordProgression } from "@/features/dojo/progression/store";
import { examSummary } from "@/features/dojo/progression/summaries";
import { saveLastExamResult } from "./examRepository";
import { summarizeExamRun } from "./results";
import type { ExamRun } from "./types";

/** Cada resposta vira um resultado no domínio; tempo esgotado conta como erro. */
export function runToMasteryResults(run: Pick<ExamRun, "answers">): MasteryResult[] {
  return run.answers.map((answer) => ({
    itemId: answer.question.item.id,
    outcome: answer.outcome === "correct" ? "correct" : "wrong",
    ms: answer.ms,
  }));
}

/**
 * Grava a rodada. `finished`: chegou ao resultado e vale como "última nota" no hub. Rodada abandonada
 * no meio e a revisão dos erros (que tende a 100%) só alimentam o domínio. Idempotente pelo id da rodada.
 */
export function commitExamRun(run: ExamRun, { finished, now }: { finished: boolean; now: number }): boolean {
  if (run.answers.length === 0) return true;

  const savedMastery = masteryStore.recordResults(runToMasteryResults(run), { sourceId: run.id, now });
  // Sequência e missão do dia: perguntas respondidas (a revisão dos erros também é prática).
  const savedActivity = recordActivity("exam", run.answers.length, { sourceId: run.id, now });
  // XP e troféus (depois da atividade do dia: a missão e a sequência já contam esta rodada).
  recordProgression(examSummary(run, finished), { now });
  if (!finished || run.review) return savedMastery && savedActivity;

  const { score, total } = summarizeExamRun(run);
  return saveLastExamResult({ score, total, mode: run.mode, finishedAt: now }) && savedMastery && savedActivity;
}
