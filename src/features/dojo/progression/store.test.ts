import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recordActivity } from "../shared/activityLog";
import { localDayNumber } from "../shared/calendar";
import { dailyMission } from "../shared/dailyMission";
import { dojoStorageKey } from "../shared/storage";
import type { SessionSummary } from "./match";
import { RemoteError } from "./remote";
import type { ProgressTotals } from "./rewards";
import { progressionStore } from "./store";

const remote = vi.hoisted(() => ({
  enabled: false,
  push: vi.fn(),
  fetchOwn: vi.fn(),
}));

vi.mock("./remote", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./remote")>();
  return {
    ...actual,
    isRemoteEnabled: () => remote.enabled,
    pushResult: (...args: unknown[]) => remote.push(...args),
    fetchOwnTotals: (...args: unknown[]) => remote.fetchOwn(...args),
  };
});

const UTC = () => 0;
const NOW = Date.UTC(2026, 10, 6, 15);

function exam(sessionId: string, performance = 90, items = 20): SessionSummary {
  return {
    activity: "exam",
    sessionId,
    finished: true,
    items,
    practiceXp: 30,
    completed: true,
    ranked: { activity: "exam", performance, distinct: 15, difficulty: 1 },
  };
}

const server = (patch: Partial<ProgressTotals>): ProgressTotals => ({ xp: 0, trophies: 0, bestTrophies: 0, wins: 0, draws: 0, losses: 0, ...patch });
const view = () => progressionStore.getSnapshot();

beforeEach(() => {
  localStorage.clear();
  remote.enabled = false;
  remote.push.mockReset();
  remote.fetchOwn.mockReset();
  progressionStore.resetForTests();
});

afterEach(() => {
  progressionStore.resetForTests();
});

describe("progresso no aparelho (sem servidor)", () => {
  it("aplica a sessão, guarda no disco e mostra a recompensa", () => {
    const reward = progressionStore.recordSession(exam("r1"), { now: NOW, offsetAt: UTC });
    expect(reward?.match).toMatchObject({ ranked: true, outcome: "win" });
    expect(view().totals.xp).toBe(reward?.xp);
    expect(view().totals.trophies).toBe(reward?.after.trophies);
    expect(view()).toMatchObject({ syncStatus: "local", pendingCount: 0 });
    expect(progressionStore.getReward("exam:r1")).toEqual(reward);
    expect(localStorage.getItem(dojoStorageKey("progression:v1:local"))).toContain("exam:r1");
  });

  it("a mesma sessão conta uma vez só (gravar ao concluir e de novo ao sair)", () => {
    const first = progressionStore.recordSession(exam("r1"), { now: NOW, offsetAt: UTC });
    const totals = view().totals;
    const again = progressionStore.recordSession({ ...exam("r1"), finished: false, items: 25 }, { now: NOW + 5_000, offsetAt: UTC });
    expect(again).toEqual(first);
    expect(view().totals).toEqual(totals);
  });

  it("sessão vazia (abriu e saiu) não conta nem gasta a chave", () => {
    expect(progressionStore.recordSession({ ...exam("r1"), items: 0, practiceXp: 0 }, { now: NOW, offsetAt: UTC })).toBeNull();
    expect(progressionStore.recordSession(exam("r1"), { now: NOW, offsetAt: UTC })).not.toBeNull();
  });

  it("cada conta tem o seu progresso no aparelho", () => {
    progressionStore.setUser("ana");
    progressionStore.recordSession(exam("r1"), { now: NOW, offsetAt: UTC });
    const ana = view().totals;
    expect(ana.xp).toBeGreaterThan(0);

    progressionStore.setUser("bia");
    expect(view().totals.xp).toBe(0);
    progressionStore.setUser("ana");
    expect(view().totals).toEqual(ana);
  });

  it("missão e sequência vêm da atividade do dia (gravada antes)", () => {
    // Um dia em que o Exame está na missão: 10 respostas cumprem a tarefa.
    let now = NOW;
    while (!dailyMission(localDayNumber(now, UTC)).some((task) => task.activity === "exam")) now += 86_400_000;
    recordActivity("exam", 10, { sourceId: "r1", now, offsetAt: UTC });
    const reward = progressionStore.recordSession(exam("r1", 90, 10), { now, offsetAt: UTC });
    expect(reward?.xpLines).toContainEqual({ source: "mission-task", label: "Tarefa da missão do dia", xp: 25 });
    expect(reward?.xpLines).toContainEqual({ source: "daily", label: "Primeiro treino do dia", xp: 25 });
  });

  it("dado estragado no disco não derruba nada", () => {
    localStorage.setItem(
      dojoStorageKey("progression:v1:ana"),
      JSON.stringify({ version: 1, base: { xp: -5, trophies: "muitos", wins: 3.7 }, pending: [{ key: 1 }], rewards: [{ key: "x" }, null], counted: [1, "exam:r9"] })
    );
    progressionStore.setUser("ana");
    expect(view().totals).toEqual(server({ wins: 3 }));
    expect(view().rewards).toEqual([]);
    expect(progressionStore.recordSession(exam("r9"), { now: NOW, offsetAt: UTC })).toBeNull(); // já contada
  });
});

describe("progresso com servidor", () => {
  beforeEach(() => {
    remote.enabled = true;
  });

  it("ao entrar, busca os totais da conta (outro aparelho pode ter jogado)", async () => {
    remote.fetchOwn.mockResolvedValue(server({ xp: 900, trophies: 1200, bestTrophies: 1300, wins: 40 }));
    progressionStore.setUser("ana");
    await vi.waitFor(() => expect(view().syncStatus).toBe("synced"));
    expect(remote.fetchOwn).toHaveBeenCalledWith("ana");
    expect(view().totals).toMatchObject({ xp: 900, trophies: 1200, wins: 40 });
    expect(view().standing.label).toBe("Ouro I");
  });

  it("a sessão espera na fila, aparece já somada e vai para o servidor", async () => {
    remote.fetchOwn.mockResolvedValue(null);
    progressionStore.setUser("ana");
    await vi.waitFor(() => expect(view().syncStatus).toBe("synced"));

    let resolvePush: (totals: ProgressTotals) => void = () => {};
    remote.push.mockImplementation(() => new Promise<ProgressTotals>((resolve) => (resolvePush = resolve)));
    const reward = progressionStore.recordSession(exam("r1"), { now: NOW, offsetAt: UTC });
    expect(view()).toMatchObject({ pendingCount: 1, syncStatus: "syncing" });
    expect(view().totals.xp).toBe(reward?.xp);
    expect(remote.push).toHaveBeenCalledWith({ key: "exam:r1", activity: "exam", xp: reward?.xp, trophies: reward?.after.trophies, outcome: "win" });

    // O servidor manda a palavra final (aqui, com XP de outro aparelho).
    resolvePush(server({ xp: 1_000, trophies: 30, bestTrophies: 30, wins: 1 }));
    await vi.waitFor(() => expect(view().syncStatus).toBe("synced"));
    expect(view()).toMatchObject({ pendingCount: 0, totals: { xp: 1_000, trophies: 30 } });
  });

  it("sem conexão: guarda e reenvia depois, na ordem", async () => {
    remote.fetchOwn.mockResolvedValue(null);
    remote.push.mockRejectedValue(new RemoteError("network", "Failed to fetch"));
    progressionStore.setUser("ana");
    await vi.waitFor(() => expect(view().syncStatus).toBe("synced"));

    progressionStore.recordSession(exam("r1"), { now: NOW, offsetAt: UTC });
    progressionStore.recordSession(exam("r2", 20), { now: NOW + 1, offsetAt: UTC });
    await vi.waitFor(() => expect(view().syncStatus).toBe("offline"));
    expect(view().pendingCount).toBe(2);

    remote.push.mockReset();
    remote.push.mockResolvedValueOnce(server({ xp: 80, trophies: 30 })).mockResolvedValueOnce(server({ xp: 110, trophies: 12 }));
    await progressionStore.sync();
    await vi.waitFor(() => expect(view().syncStatus).toBe("synced"));
    expect(remote.push.mock.calls.map(([item]) => (item as { key: string }).key)).toEqual(["exam:r1", "exam:r2"]);
    expect(view()).toMatchObject({ pendingCount: 0, totals: { xp: 110, trophies: 12 } });
  });

  it("resultado recusado sai da fila; servidor sem o SQL do ranking deixa a fila esperando", async () => {
    remote.fetchOwn.mockResolvedValue(null);
    progressionStore.setUser("ana");
    await vi.waitFor(() => expect(view().syncStatus).toBe("synced"));

    remote.push.mockRejectedValueOnce(new RemoteError("rejected", "fora das regras"));
    progressionStore.recordSession(exam("r1"), { now: NOW, offsetAt: UTC });
    await vi.waitFor(() => expect(view().pendingCount).toBe(0));
    expect(view().totals.xp).toBe(0);

    remote.push.mockRejectedValue(new RemoteError("unavailable", "Could not find the function"));
    progressionStore.recordSession(exam("r2"), { now: NOW, offsetAt: UTC });
    await vi.waitFor(() => expect(view().syncStatus).toBe("unavailable"));
    expect(view().pendingCount).toBe(1);
    expect(view().totals.xp).toBeGreaterThan(0);
  });

  it("os pendentes ficam no disco: recarregar a página não perde a sessão", async () => {
    remote.fetchOwn.mockResolvedValue(null);
    remote.push.mockRejectedValue(new RemoteError("network", "offline"));
    progressionStore.setUser("ana");
    progressionStore.recordSession(exam("r1"), { now: NOW, offsetAt: UTC });
    await vi.waitFor(() => expect(view().syncStatus).toBe("offline"));

    progressionStore.resetForTests();
    progressionStore.setUser("ana");
    expect(view().pendingCount).toBe(1);
  });
});
