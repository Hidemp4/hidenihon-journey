import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyActivity,
  computeStreak,
  countsForDay,
  EMPTY_ACTIVITY_LOG,
  loadActivityLog,
  recordActivity,
  sanitizeActivityLog,
  saveActivityLog,
  type ActivityLog,
} from "./activityLog";
import { localDayNumber } from "./calendar";
import { dailyMission, MISSION_POOL, MISSION_SIZE, missionProgress } from "./dailyMission";
import { createMemoryStorage } from "./test/memoryStorage";
import { SAO_PAULO, TOKYO } from "./test/zones";

const KEY = "hidenihon:dojo:activity:v1";

function logWithDays(days: number[]): ActivityLog {
  return days.reduce<ActivityLog>((log, day, index) => applyActivity(log, { activity: "exam", amount: 1, day, sourceId: `s${index}` }), EMPTY_ACTIVITY_LOG);
}

describe("registro de atividade (puro)", () => {
  it("soma por dia e por atividade; dias do mais recente para o mais antigo", () => {
    let log = applyActivity(EMPTY_ACTIVITY_LOG, { activity: "scrolls", amount: 4, day: 100, sourceId: "a" });
    log = applyActivity(log, { activity: "scrolls", amount: 3, day: 100, sourceId: "b" });
    log = applyActivity(log, { activity: "seals", amount: 6, day: 100, sourceId: "c" });
    log = applyActivity(log, { activity: "exam", amount: 2, day: 98, sourceId: "d" });
    log = applyActivity(log, { activity: "exam", amount: 1, day: 101, sourceId: "e" });

    expect(log.days.map((entry) => entry.day)).toEqual([101, 100, 98]);
    expect(countsForDay(log, 100)).toEqual({ scrolls: 7, seals: 6 });
    expect(countsForDay(log, 99)).toEqual({});
  });

  it("a mesma sessão não conta duas vezes; quantidade zero não muda nada", () => {
    const once = applyActivity(EMPTY_ACTIVITY_LOG, { activity: "brush", amount: 2, day: 5, sourceId: "s1" });
    expect(applyActivity(once, { activity: "brush", amount: 2, day: 5, sourceId: "s1" })).toBe(once);
    expect(applyActivity(once, { activity: "brush", amount: 0, day: 5, sourceId: "s2" })).toBe(once);
    expect(applyActivity(once, { activity: "brush", amount: Number.NaN, day: 5, sourceId: "s3" })).toBe(once);
    // Mesmo id em atividades diferentes são lotes diferentes.
    expect(countsForDay(applyActivity(once, { activity: "exam", amount: 1, day: 5, sourceId: "s1" }), 5)).toEqual({ brush: 2, exam: 1 });
  });
});

describe("sequência de dias", () => {
  it("conta até hoje; se hoje ainda não teve treino, conta até ontem (só quebra amanhã)", () => {
    expect(computeStreak(logWithDays([10, 9, 8]), 10)).toEqual({ current: 3, best: 3, activeToday: true });
    expect(computeStreak(logWithDays([9, 8]), 10)).toEqual({ current: 2, best: 2, activeToday: false });
    expect(computeStreak(logWithDays([8, 7]), 10)).toEqual({ current: 0, best: 2, activeToday: false });
    expect(computeStreak(EMPTY_ACTIVITY_LOG, 10)).toEqual({ current: 0, best: 0, activeToday: false });
  });

  it("guarda a melhor sequência mesmo depois de quebrar", () => {
    expect(computeStreak(logWithDays([1, 2, 3, 4, 5, 8, 9]), 9)).toEqual({ current: 2, best: 5, activeToday: true });
  });
});

describe("missão do dia", () => {
  it("3 tarefas de atividades diferentes, iguais o dia todo, na ordem dos cards", () => {
    const mission = dailyMission(20_000);
    expect(mission).toHaveLength(MISSION_SIZE);
    expect(new Set(mission.map((task) => task.activity)).size).toBe(MISSION_SIZE);
    expect(dailyMission(20_000)).toEqual(mission);
    const order = MISSION_POOL.map((task) => task.activity);
    expect(mission.map((task) => order.indexOf(task.activity))).toEqual([...mission.map((task) => order.indexOf(task.activity))].sort((a, b) => a - b));
  });

  it("muda com os dias e passa por todas as atividades", () => {
    const missions = Array.from({ length: 30 }, (_, index) => dailyMission(20_000 + index).map((task) => task.activity).join(","));
    expect(new Set(missions).size).toBeGreaterThan(3);
    const seen = new Set(missions.flatMap((mission) => mission.split(",")));
    expect(seen.size).toBe(MISSION_POOL.length);
  });

  it("progresso limitado à meta; missão cumprida com as 3", () => {
    const tasks = MISSION_POOL.filter((task) => ["scrolls", "seals", "brush"].includes(task.activity));
    const partial = missionProgress(tasks, { scrolls: 25, seals: 2, exam: 99 });
    expect(partial.tasks.map(({ done, complete }) => [done, complete])).toEqual([
      [10, true],
      [2, false],
      [0, false],
    ]);
    expect(partial).toMatchObject({ completed: 1, complete: false });
    expect(missionProgress(tasks, { scrolls: 10, seals: 6, brush: 3 })).toMatchObject({ completed: 3, complete: true });
    expect(missionProgress([], {}).complete).toBe(false);
  });
});

describe("registro de atividade (armazenamento)", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("grava no dia local da pessoa (o mesmo instante é dia diferente em São Paulo e Tóquio)", () => {
    const lateNightSaoPaulo = Date.UTC(2026, 10, 1, 2, 30); // 31/10 23:30 em São Paulo, 01/11 11:30 em Tóquio
    expect(recordActivity("exam", 10, { sourceId: "r1", now: lateNightSaoPaulo, offsetAt: SAO_PAULO })).toBe(true);
    expect(recordActivity("exam", 4, { sourceId: "r2", now: lateNightSaoPaulo, offsetAt: TOKYO })).toBe(true);
    const log = loadActivityLog();
    expect(countsForDay(log, localDayNumber(lateNightSaoPaulo, SAO_PAULO))).toEqual({ exam: 10 });
    expect(countsForDay(log, localDayNumber(lateNightSaoPaulo, TOKYO))).toEqual({ exam: 4 });
    expect(JSON.parse(localStorage.getItem(KEY) ?? "null").version).toBe(1);
    // Repetir o mesmo lote não grava nada novo.
    expect(recordActivity("exam", 10, { sourceId: "r1", now: lateNightSaoPaulo, offsetAt: SAO_PAULO })).toBe(true);
    expect(countsForDay(loadActivityLog(), localDayNumber(lateNightSaoPaulo, SAO_PAULO))).toEqual({ exam: 10 });
  });

  it("dado inválido é descartado, campo a campo", () => {
    expect(
      sanitizeActivityLog({
        days: [
          { day: 10, counts: { exam: 3, seals: -1, voar: 9, brush: 2.7 } },
          { day: 10, counts: { exam: 99 } },
          { day: 9.5, counts: { exam: 1 } },
          { day: 8, counts: "muito" },
          "dia",
        ],
        recentSources: ["exam:a", 7, "x".repeat(200)],
      })
    ).toEqual({ days: [{ day: 10, counts: { exam: 3, brush: 2 } }], recentSources: ["exam:a"] });
    expect(sanitizeActivityLog(null)).toEqual(EMPTY_ACTIVITY_LOG);

    localStorage.setItem(KEY, "{quebrado");
    expect(loadActivityLog()).toEqual(EMPTY_ACTIVITY_LOG);
    localStorage.setItem(KEY, JSON.stringify({ version: 9, days: [{ day: 1, counts: { exam: 1 } }] }));
    expect(loadActivityLog()).toEqual(EMPTY_ACTIVITY_LOG);
  });

  it("quota cheia: tenta de novo só com os dias mais recentes; sem armazenamento, não lança", () => {
    const log = logWithDays(Array.from({ length: 300 }, (_, index) => 1_000 + index));
    vi.stubGlobal("localStorage", createMemoryStorage({ failOnSet: (value) => value.length > 4_000 }));
    expect(saveActivityLog(log)).toBe(true);
    const saved = loadActivityLog();
    expect(saved.days.length).toBeLessThanOrEqual(30);
    expect(saved.days[0].day).toBe(1_299);

    vi.stubGlobal("localStorage", undefined);
    expect(loadActivityLog()).toEqual(EMPTY_ACTIVITY_LOG);
    expect(recordActivity("seals", 1, { sourceId: "z", now: 0 })).toBe(false);
  });
});
