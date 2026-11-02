import { countsForDay, loadActivityLog } from "@/features/dojo/shared/activityLog";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadMastery } from "@/features/dojo/shared/mastery";
import { localDayNumber } from "@/features/dojo/shared/calendar";
import { createMemoryStorage } from "@/features/dojo/shared/test/memoryStorage";
import { SAO_PAULO } from "@/features/dojo/shared/test/zones";
import { commitScrollSession, countIntroduced, sessionToMasteryResults } from "./commit";
import { loadIntroducedToday } from "./scrollsRepository";
import { NOON, flipAndGrade, startSession } from "./testUtils";
import type { ScrollSession } from "./types";

function finishedSession(mode: "review" | "free" = "review"): ScrollSession {
  let state = startSession(3, mode);
  state = flipAndGrade(state, "again"); // あ: próxima sessão
  state = flipAndGrade(state, "good"); // い: amanhã
  state = flipAndGrade(state, "easy"); // う: em 3 dias
  if (state.game.screen !== "summary") throw new Error("deveria terminar");
  return state.game.session;
}

describe("gravação da sessão dos Pergaminhos", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("manda cada nota com a agenda e o tempo até virar (Fácil também conta como acerto)", () => {
    expect(sessionToMasteryResults(finishedSession())).toEqual([
      { itemId: "hiragana:あ", outcome: "wrong", ms: 0, schedule: { box: 1, dueAt: Date.UTC(2026, 9, 31, 3) } },
      { itemId: "hiragana:い", outcome: "correct", ms: 0, schedule: { box: 2, dueAt: Date.UTC(2026, 10, 1, 3) } },
      { itemId: "hiragana:う", outcome: "correct", ms: 0, schedule: { box: 3, dueAt: Date.UTC(2026, 10, 3, 3) } },
    ]);
    expect(sessionToMasteryResults(finishedSession("free")).every((result) => result.schedule === undefined)).toBe(true);
  });

  it("conta como novos apresentados só as cartas novas da revisão", () => {
    expect(countIntroduced(finishedSession())).toBe(3);
    expect(countIntroduced(finishedSession("free"))).toBe(0);
  });

  it("grava caixa/vencimento no mastery e o contador do dia, uma vez só", () => {
    const session = finishedSession();
    expect(commitScrollSession(session)).toBe(true);
    expect(commitScrollSession(session)).toBe(true);
    // Sequência e missão do dia: 3 cartas avaliadas, contadas uma vez.
    const last = session.history[session.history.length - 1];
    expect(countsForDay(loadActivityLog(), localDayNumber(last.gradedAt, session.offsetAt))).toEqual({ scrolls: 3 });

    const { items } = loadMastery();
    expect(items["hiragana:あ"]).toMatchObject({ seen: 1, correct: 0, box: 1, dueAt: Date.UTC(2026, 9, 31, 3) });
    expect(items["hiragana:い"]).toMatchObject({ seen: 1, correct: 1, box: 2, dueAt: Date.UTC(2026, 10, 1, 3) });
    expect(items["hiragana:う"]).toMatchObject({ seen: 1, correct: 1, box: 3, dueAt: Date.UTC(2026, 10, 3, 3) });
    expect(loadIntroducedToday(localDayNumber(NOON, SAO_PAULO))).toBe(3);
  });

  it("treino livre grava acertos sem mexer na agenda", () => {
    commitScrollSession(finishedSession("free"));

    const { items } = loadMastery();
    expect(items["hiragana:い"]).toMatchObject({ seen: 1, correct: 1, box: 1, dueAt: null });
  });

  it("avisa quando o armazenamento está cheio", () => {
    vi.stubGlobal("localStorage", createMemoryStorage({ failOnSet: () => true }));
    expect(commitScrollSession(finishedSession())).toBe(false);
  });
});
