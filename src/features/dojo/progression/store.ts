import type { ActivityId } from "../registry";
import { computeStreak, countsForDay, LOGGED_ACTIVITIES, loadActivityLog } from "../shared/activityLog";
import { localDayNumber, systemUtcOffset, type UtcOffsetFn } from "../shared/calendar";
import { dailyMission, missionProgress } from "../shared/dailyMission";
import { dojoStorageKey, isFiniteNumber, isRecord, readJson, writeFirstThatFits } from "../shared/storage";
import { levelFor, metaFor, standingFor, type LeagueStanding, type LevelProgress } from "./ladder";
import type { MatchResult, SessionSummary } from "./match";
import { fetchOwnTotals, isRemoteEnabled, pushResult, RemoteError } from "./remote";
import {
  applySession,
  EMPTY_TOTALS,
  sessionKey,
  totalsWithPending,
  type AwardMarks,
  type PendingResult,
  type ProgressTotals,
  type SessionReward,
  type XpLine,
  type XpSource,
} from "./rewards";

/*
 * Estado de XP/troféus de quem está logado. Mora no aparelho (por conta) e vai para o servidor:
 * - `base`: os últimos totais confirmados pelo servidor (sem servidor, os totais locais);
 * - `pending`: resultados ainda não enviados. O que a tela mostra é `base + pending`.
 * Módulo com estado próprio (como o `masteryStore`): as atividades gravam fora do React.
 */

const STORAGE_VERSION = 1;
const MAX_PENDING = 200;
const MAX_COUNTED = 300;
const MAX_REWARDS = 20;

interface ProgressionData {
  base: ProgressTotals;
  pending: PendingResult[];
  marks: AwardMarks;
  /** Chaves das sessões já aplicadas (gravar ao concluir e de novo ao sair conta uma vez). */
  counted: string[];
  /** Mais recentes primeiro. */
  rewards: SessionReward[];
}

const EMPTY_DATA: ProgressionData = {
  base: EMPTY_TOTALS,
  pending: [],
  marks: { dailyBonusDay: null, missionAwards: [] },
  counted: [],
  rewards: [],
};

/**
 * - `local`: sem servidor (Supabase não configurado ou sem login): tudo fica no aparelho;
 * - `unavailable`: há servidor, mas o SQL do ranking não foi aplicado;
 * - `offline`: o último envio falhou por conexão.
 */
export type SyncStatus = "local" | "idle" | "syncing" | "synced" | "offline" | "unavailable";

export interface ProgressionView {
  userId: string | null;
  totals: ProgressTotals;
  level: LevelProgress;
  standing: LeagueStanding;
  /** Meta (desempenho para vencer) com os troféus atuais. */
  meta: number;
  rewards: readonly SessionReward[];
  pendingCount: number;
  syncStatus: SyncStatus;
}

/* ---------- Disco ---------- */

const OUTCOMES = new Set(["win", "draw", "loss"]);
const PENDING_OUTCOMES = new Set(["win", "draw", "loss", "unranked"]);
const REASONS = new Set(["self-graded", "review", "study", "too-short"]);
const XP_SOURCES: ReadonlySet<XpSource> = new Set(["practice", "session", "result", "daily", "mission-task", "mission", "league"]);

const toCount = (value: unknown) => (isFiniteNumber(value) && value > 0 ? Math.floor(value) : 0);
const isActivity = (value: unknown): value is ActivityId => typeof value === "string" && (LOGGED_ACTIVITIES as readonly string[]).includes(value);

function sanitizeTotals(raw: unknown): ProgressTotals {
  if (!isRecord(raw)) return EMPTY_TOTALS;
  const trophies = toCount(raw.trophies);
  return {
    xp: toCount(raw.xp),
    trophies,
    bestTrophies: Math.max(trophies, toCount(raw.bestTrophies)),
    wins: toCount(raw.wins),
    draws: toCount(raw.draws),
    losses: toCount(raw.losses),
  };
}

function sanitizePending(raw: unknown): PendingResult | null {
  if (!isRecord(raw) || typeof raw.key !== "string" || !isActivity(raw.activity) || !isFiniteNumber(raw.xp) || !isFiniteNumber(raw.trophies)) return null;
  if (typeof raw.outcome !== "string" || !PENDING_OUTCOMES.has(raw.outcome)) return null;
  return { key: raw.key, activity: raw.activity, xp: Math.max(0, Math.round(raw.xp)), trophies: Math.round(raw.trophies), outcome: raw.outcome as PendingResult["outcome"] };
}

function sanitizeMatch(raw: unknown): MatchResult | null {
  if (!isRecord(raw)) return null;
  if (raw.ranked === false) return typeof raw.reason === "string" && REASONS.has(raw.reason) ? { ranked: false, reason: raw.reason as Extract<MatchResult, { ranked: false }>["reason"] } : null;
  if (raw.ranked !== true || typeof raw.outcome !== "string" || !OUTCOMES.has(raw.outcome) || !isRecord(raw.factors)) return null;
  if (![raw.trophies, raw.performance, raw.meta].every(isFiniteNumber)) return null;
  const factors = raw.factors;
  if (![factors.volume, factors.variety, factors.difficulty, factors.lossFactor].every(isFiniteNumber)) return null;
  return {
    ranked: true,
    outcome: raw.outcome as Extract<MatchResult, { ranked: true }>["outcome"],
    trophies: raw.trophies as number,
    performance: raw.performance as number,
    meta: raw.meta as number,
    factors: { volume: factors.volume as number, variety: factors.variety as number, difficulty: factors.difficulty as number, lossFactor: factors.lossFactor as number },
  };
}

function sanitizePair(raw: unknown): { xp: number; trophies: number } | null {
  return isRecord(raw) && isFiniteNumber(raw.xp) && isFiniteNumber(raw.trophies) ? { xp: raw.xp, trophies: raw.trophies } : null;
}

function sanitizeReward(raw: unknown): SessionReward | null {
  if (!isRecord(raw) || typeof raw.key !== "string" || !isActivity(raw.activity) || !isFiniteNumber(raw.at) || !isFiniteNumber(raw.xp)) return null;
  const match = sanitizeMatch(raw.match);
  const before = sanitizePair(raw.before);
  const after = sanitizePair(raw.after);
  if (!match || !before || !after || !Array.isArray(raw.xpLines)) return null;
  const xpLines: XpLine[] = raw.xpLines.flatMap((line) =>
    isRecord(line) && typeof line.label === "string" && isFiniteNumber(line.xp) && XP_SOURCES.has(line.source as XpSource)
      ? [{ source: line.source as XpSource, label: line.label, xp: line.xp }]
      : []
  );
  const change = isRecord(raw.leagueChange) && isFiniteNumber(raw.leagueChange.from) && isFiniteNumber(raw.leagueChange.to) ? { from: raw.leagueChange.from, to: raw.leagueChange.to } : null;
  return {
    key: raw.key,
    activity: raw.activity,
    at: raw.at,
    match,
    xp: raw.xp,
    xpLines,
    before,
    after,
    levelUp: isFiniteNumber(raw.levelUp) ? raw.levelUp : null,
    leagueChange: change,
  };
}

const strings = (value: unknown, max: number) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, max) : []);

export function sanitizeProgression(raw: unknown): ProgressionData {
  if (!isRecord(raw)) return EMPTY_DATA;
  const marks = isRecord(raw.marks) ? raw.marks : {};
  return {
    base: sanitizeTotals(raw.base),
    pending: (Array.isArray(raw.pending) ? raw.pending : []).flatMap((item) => sanitizePending(item) ?? []).slice(-MAX_PENDING),
    marks: {
      dailyBonusDay: isFiniteNumber(marks.dailyBonusDay) ? Math.floor(marks.dailyBonusDay) : null,
      missionAwards: strings(marks.missionAwards, 30),
    },
    counted: strings(raw.counted, MAX_COUNTED),
    rewards: (Array.isArray(raw.rewards) ? raw.rewards : []).flatMap((item) => sanitizeReward(item) ?? []).slice(0, MAX_REWARDS),
  };
}

function storageKey(userId: string | null) {
  return dojoStorageKey(`progression:v${STORAGE_VERSION}:${userId ?? "local"}`);
}

function load(userId: string | null): ProgressionData {
  const stored = readJson(storageKey(userId));
  if (!isRecord(stored) || stored.version !== STORAGE_VERSION) return EMPTY_DATA;
  return sanitizeProgression(stored);
}

/** Se a quota estourar, guarda menos histórico (os totais e os pendentes nunca saem). */
function save(userId: string | null, data: ProgressionData): boolean {
  function* payloads() {
    for (const rewards of [MAX_REWARDS, 5, 0]) {
      yield JSON.stringify({ version: STORAGE_VERSION, ...data, rewards: data.rewards.slice(0, rewards) });
    }
  }
  return writeFirstThatFits(storageKey(userId), payloads());
}

/* ---------- Store ---------- */

function createProgressionStore() {
  let userId: string | null = null;
  let data: ProgressionData = load(null);
  let syncStatus: SyncStatus = "local";
  let syncing: Promise<void> | null = null;
  let syncAgain = false;
  const listeners = new Set<() => void>();
  let view = buildView();

  function remoteOn() {
    return userId != null && isRemoteEnabled();
  }

  function buildView(): ProgressionView {
    const totals = totalsWithPending(data.base, data.pending);
    return {
      userId,
      totals,
      level: levelFor(totals.xp),
      standing: standingFor(totals.trophies),
      meta: metaFor(totals.trophies),
      rewards: data.rewards,
      pendingCount: data.pending.length,
      syncStatus,
    };
  }

  function emit() {
    view = buildView();
    listeners.forEach((listener) => listener());
  }

  function commit(next: ProgressionData) {
    data = next;
    save(userId, data);
    emit();
  }

  function setStatus(status: SyncStatus) {
    if (status === syncStatus) return;
    syncStatus = status;
    emit();
  }

  /** Envia os pendentes, na ordem; sem pendentes, busca os totais (outro aparelho pode ter jogado). */
  async function runSync(owner: string) {
    setStatus("syncing");
    let pushed = false;
    while (data.pending.length > 0) {
      const item = data.pending[0];
      try {
        const totals = await pushResult(item);
        if (userId !== owner) return;
        pushed = true;
        commit({ ...data, base: totals, pending: data.pending.filter((pending) => pending.key !== item.key) });
      } catch (error) {
        if (userId !== owner) return;
        if (error instanceof RemoteError && error.kind === "rejected") {
          // Fora das regras: reenviar não muda nada. Sai da fila e o total local volta ao do servidor.
          commit({ ...data, pending: data.pending.filter((pending) => pending.key !== item.key) });
          continue;
        }
        setStatus(error instanceof RemoteError && error.kind === "unavailable" ? "unavailable" : "offline");
        return;
      }
    }

    if (!pushed) {
      try {
        const totals = await fetchOwnTotals(owner);
        if (userId !== owner) return;
        // Sem linha no servidor = ainda não jogou com esta conta (ou o SQL acabou de ser aplicado).
        if (totals) commit({ ...data, base: totals });
      } catch (error) {
        if (userId !== owner) return;
        setStatus(error instanceof RemoteError && error.kind === "unavailable" ? "unavailable" : "offline");
        return;
      }
    }
    setStatus("synced");
  }

  function sync(): Promise<void> {
    const owner = userId;
    if (owner == null || !remoteOn()) return Promise.resolve();
    if (syncing) {
      syncAgain = true;
      return syncing;
    }
    syncing = (async () => {
      try {
        do {
          syncAgain = false;
          await runSync(owner);
        } while (syncAgain && userId === owner);
      } finally {
        syncing = null;
      }
    })();
    return syncing;
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getSnapshot(): ProgressionView {
      return view;
    },

    /** Conta logada (cada conta tem o seu XP no aparelho). Troca de conta relê do disco e sincroniza. */
    setUser(next: string | null) {
      if (next === userId) return;
      userId = next;
      data = load(userId);
      syncStatus = remoteOn() ? "idle" : "local";
      emit();
      void sync();
    },

    /**
     * Aplica uma sessão (uma vez por sessão: repetir devolve o resultado já calculado). Chame depois
     * de `recordActivity`: a missão e a sequência do dia já precisam contar esta sessão.
     */
    recordSession(summary: SessionSummary, { now, offsetAt = systemUtcOffset }: { now: number; offsetAt?: UtcOffsetFn }): SessionReward | null {
      const key = sessionKey(summary.activity, summary.sessionId);
      if (data.counted.includes(key)) return data.rewards.find((reward) => reward.key === key) ?? null;
      // Nada a contar (abriu e saiu): não gasta a chave, a mesma sessão ainda pode concluir.
      if (summary.items === 0 && summary.practiceXp === 0) return null;

      const day = localDayNumber(now, offsetAt);
      const log = loadActivityLog();
      const mission = missionProgress(dailyMission(day), countsForDay(log, day));
      const applied = applySession(
        totalsWithPending(data.base, data.pending),
        data.marks,
        summary,
        {
          day,
          streak: computeStreak(log, day).current,
          missionTasksDone: mission.tasks.filter((task) => task.complete).map((task) => task.task.activity),
          missionComplete: mission.complete,
        },
        now
      );

      const queued = remoteOn();
      commit({
        // Sem servidor, os totais locais são a base; com servidor, a sessão espera na fila.
        base: queued ? data.base : applied.totals,
        pending: queued ? [...data.pending, applied.pending].slice(-MAX_PENDING) : data.pending,
        marks: applied.marks,
        counted: [key, ...data.counted].slice(0, MAX_COUNTED),
        rewards: [applied.reward, ...data.rewards].slice(0, MAX_REWARDS),
      });
      if (queued) void sync();
      return applied.reward;
    },

    getReward(key: string): SessionReward | null {
      return data.rewards.find((reward) => reward.key === key) ?? null;
    },

    sync,

    /** Só para testes: volta ao estado inicial, sem conta. */
    resetForTests() {
      userId = null;
      data = load(null);
      syncStatus = "local";
      syncing = null;
      syncAgain = false;
      emit();
    },
  };
}

export const progressionStore = createProgressionStore();

/** Atalho para as atividades: grava a sessão no progresso (XP, troféus, ranking). */
export function recordProgression(summary: SessionSummary, options: { now: number; offsetAt?: UtcOffsetFn }): SessionReward | null {
  return progressionStore.recordSession(summary, options);
}
