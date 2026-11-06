import { describe, expect, it } from "vitest";
import type { SessionSummary } from "./match";
import { applySession, EMPTY_TOTALS, totalsWithPending, type AwardMarks, type ProgressTotals, type RewardContext } from "./rewards";

const NO_MARKS: AwardMarks = { dailyBonusDay: null, missionAwards: [] };
const DAY = 20_400;
const QUIET_DAY: RewardContext = { day: DAY, streak: 1, missionTasksDone: [], missionComplete: false };

function examSession(performance: number, overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    activity: "exam",
    sessionId: "rodada-1",
    finished: true,
    items: 20,
    practiceXp: 30,
    completed: true,
    ranked: { activity: "exam", performance, distinct: 15, difficulty: 1 },
    ...overrides,
  };
}

const totals = (patch: Partial<ProgressTotals>): ProgressTotals => ({ ...EMPTY_TOTALS, ...patch });
const xpBy = (lines: ReadonlyArray<{ source: string; xp: number }>, source: string) => lines.filter((line) => line.source === source).reduce((sum, line) => sum + line.xp, 0);

describe("XP e troféus de uma sessão", () => {
  it("prática + sessão concluída + vitória + 1º treino do dia; troféus e estatísticas", () => {
    const { totals: next, reward, pending } = applySession(totals({ trophies: 950, bestTrophies: 950 }), NO_MARKS, examSession(88), QUIET_DAY, 1_000);
    expect(reward.match).toMatchObject({ ranked: true, outcome: "win", trophies: 26 });
    expect(reward.xpLines.map((line) => [line.source, line.xp])).toEqual([
      ["practice", 30],
      ["session", 10],
      ["result", 15],
      ["daily", 25], // 20 + 5 × 1 dia de sequência
    ]);
    expect(next).toEqual({ xp: 80, trophies: 976, bestTrophies: 976, wins: 1, draws: 0, losses: 0 });
    expect(pending).toEqual({ key: "exam:rodada-1", activity: "exam", xp: 80, trophies: 26, outcome: "win" });
    expect(reward).toMatchObject({ key: "exam:rodada-1", before: { xp: 0, trophies: 950 }, after: { xp: 80, trophies: 976 } });
  });

  it("derrota: sem XP de resultado, troféus caem, recorde fica", () => {
    const { totals: next, reward } = applySession(totals({ xp: 500, trophies: 950, bestTrophies: 1200 }), { ...NO_MARKS, dailyBonusDay: DAY }, examSession(30), QUIET_DAY, 0);
    expect(reward.match).toMatchObject({ outcome: "loss" });
    expect(xpBy(reward.xpLines, "result")).toBe(0);
    expect(next).toMatchObject({ trophies: 950 + (reward.match.ranked ? reward.match.trophies : 0), bestTrophies: 1200, losses: 1 });
    expect(reward.leagueChange).toBeNull();
  });

  it("bônus do dia: uma vez por dia, 5 por dia de sequência até +50", () => {
    const first = applySession(EMPTY_TOTALS, NO_MARKS, examSession(90), { ...QUIET_DAY, streak: 30 }, 0);
    expect(xpBy(first.reward.xpLines, "daily")).toBe(70);
    const second = applySession(first.totals, first.marks, examSession(90, { sessionId: "rodada-2" }), { ...QUIET_DAY, streak: 30 }, 0);
    expect(xpBy(second.reward.xpLines, "daily")).toBe(0);
    const tomorrow = applySession(second.totals, second.marks, examSession(90, { sessionId: "rodada-3" }), { ...QUIET_DAY, day: DAY + 1, streak: 0 }, 0);
    expect(xpBy(tomorrow.reward.xpLines, "daily")).toBe(20);
  });

  it("sessão sem XP de prática não gasta o bônus do dia", () => {
    const study: SessionSummary = { activity: "brush", sessionId: "estudo", finished: true, items: 0, practiceXp: 0, completed: false, ranked: null, unrankedReason: "study" };
    const result = applySession(EMPTY_TOTALS, NO_MARKS, study, QUIET_DAY, 0);
    expect(result.reward.xp).toBe(0);
    expect(result.marks.dailyBonusDay).toBeNull();
  });

  it("missão do dia: +25 por tarefa e +50 com as três, cada uma uma vez só", () => {
    const context: RewardContext = { ...QUIET_DAY, missionTasksDone: ["exam", "seals", "brush"], missionComplete: true };
    const first = applySession(EMPTY_TOTALS, NO_MARKS, examSession(90), context, 0);
    expect(xpBy(first.reward.xpLines, "mission-task")).toBe(75);
    expect(xpBy(first.reward.xpLines, "mission")).toBe(50);
    const again = applySession(first.totals, first.marks, examSession(90, { sessionId: "rodada-2" }), context, 0);
    expect(xpBy(again.reward.xpLines, "mission-task") + xpBy(again.reward.xpLines, "mission")).toBe(0);
    // Marcas de dias antigos saem (o dia novo tem chaves novas).
    const later = applySession(again.totals, again.marks, examSession(90, { sessionId: "rodada-3" }), { ...QUIET_DAY, day: DAY + 5 }, 0);
    expect(later.marks.missionAwards).toEqual([]);
  });

  it("liga nova dá XP só na 1ª vez (cair e voltar não paga de novo)", () => {
    const promoted = applySession(totals({ trophies: 290, bestTrophies: 290 }), NO_MARKS, examSession(100), QUIET_DAY, 0);
    expect(promoted.reward.leagueChange).toEqual({ from: 0, to: 1 });
    expect(promoted.reward.xpLines).toContainEqual({ source: "league", label: "Primeira vez na liga Prata", xp: 100 });

    const back = applySession(totals({ trophies: 290, bestTrophies: 400 }), NO_MARKS, examSession(100), QUIET_DAY, 0);
    expect(xpBy(back.reward.xpLines, "league")).toBe(0);
  });

  it("avisa quando sobe de nível", () => {
    const { reward } = applySession(totals({ xp: 90 }), NO_MARKS, examSession(90), QUIET_DAY, 0);
    expect(reward.levelUp).toBe(2);
    expect(applySession(totals({ xp: 0 }), { ...NO_MARKS, dailyBonusDay: DAY }, examSession(90, { practiceXp: 2, completed: false }), QUIET_DAY, 0).reward.levelUp).toBeNull();
  });

  it("totais com pendentes: soma XP, aplica troféus em ordem (sem passar do zero) e conta resultados", () => {
    const server = totals({ xp: 100, trophies: 10, bestTrophies: 40, wins: 2 });
    expect(
      totalsWithPending(server, [
        { key: "a", activity: "exam", xp: 20, trophies: -15, outcome: "loss" },
        { key: "b", activity: "seals", xp: 30, trophies: 45, outcome: "win" },
        { key: "c", activity: "scrolls", xp: 8, trophies: 0, outcome: "unranked" },
      ])
    ).toEqual({ xp: 158, trophies: 45, bestTrophies: 45, wins: 3, draws: 0, losses: 1 });
  });
});
