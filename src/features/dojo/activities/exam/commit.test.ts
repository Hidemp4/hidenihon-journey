import { countsForDay, loadActivityLog } from "@/features/dojo/shared/activityLog";
import { localDayNumber, systemUtcOffset } from "@/features/dojo/shared/calendar";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadMastery } from "@/features/dojo/shared/mastery";
import { createMemoryStorage } from "@/features/dojo/shared/test/memoryStorage";
import { describeExamBadge } from "./badge";
import { commitExamRun, runToMasteryResults } from "./commit";
import { loadLastExamResult } from "./examRepository";
import { answer, run, startExam } from "./testUtils";
import type { ExamRun } from "./types";

function finishedRun(): ExamRun {
  let state = startExam({ mode: "lightning", questionCount: 10 });
  for (let index = 0; index < 9; index += 1) state = answer(state, index !== 0);
  if (state.game.screen !== "question") throw new Error("falta a 10ª");
  const last = state.game.run.question;
  state = run(state, { type: "TIMEOUT", questionId: last.id, now: 9_000 }, { type: "NEXT", questionId: last.id, seed: 1, now: 9_010 });
  if (state.game.screen !== "result") throw new Error("deveria terminar");
  return state.game.run;
}

describe("gravação do Exame", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("cada resposta vira um resultado; tempo esgotado é erro", () => {
    const results = runToMasteryResults(finishedRun());
    expect(results).toHaveLength(10);
    expect(results.filter((result) => result.outcome === "wrong")).toHaveLength(2);
  });

  it("rodada terminada grava o domínio e a última nota, uma vez só", () => {
    const finished = finishedRun();
    expect(commitExamRun(finished, { finished: true, now: 77 })).toBe(true);
    expect(commitExamRun(finished, { finished: true, now: 88 })).toBe(true);
    expect(countsForDay(loadActivityLog(), localDayNumber(77, systemUtcOffset))).toEqual({ exam: 10 });

    const seen = Object.values(loadMastery().items).reduce((sum, record) => sum + record.seen, 0);
    expect(seen).toBe(10);
    expect(loadLastExamResult()).toEqual({ score: 80, total: 10, mode: "lightning", finishedAt: 88 });
    expect(describeExamBadge(loadLastExamResult())).toEqual({ text: "Última nota 80%", tone: "accent" });
  });

  it("rodada abandonada e revisão dos erros não viram 'última nota'", () => {
    commitExamRun(finishedRun(), { finished: false, now: 1 });
    expect(loadLastExamResult()).toBeNull();

    commitExamRun({ ...finishedRun(), id: "revisao", review: true }, { finished: true, now: 2 });
    expect(loadLastExamResult()).toBeNull();
    expect(Object.values(loadMastery().items).reduce((sum, record) => sum + record.seen, 0)).toBe(20);
  });

  it("sem exame ainda", () => {
    expect(describeExamBadge(null)).toEqual({ text: "Nenhum exame ainda", tone: "neutral" });
  });
});
