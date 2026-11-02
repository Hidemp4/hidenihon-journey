import type { ActivityId } from "../registry";
import { localDayNumber, systemUtcOffset, type UtcOffsetFn } from "./calendar";
import { dojoStorageKey, isFiniteNumber, isRecord, readJson, writeFirstThatFits } from "./storage";

/**
 * Quanto se praticou em cada atividade, por dia local. É a base da sequência de dias e da missão
 * do dia no hub. Unidades: cartas avaliadas (Pergaminhos), perguntas respondidas (Exame), pares
 * formados (Selos), caracteres escritos (Pincel) e kana respondidos (Arena de Reflexos).
 */

const STORAGE_VERSION = 1;
const STORAGE_KEY = dojoStorageKey(`activity:v${STORAGE_VERSION}`);

/** Mais de um ano de dias ativos cabe em poucos KB; acima disso o dia mais antigo sai primeiro. */
const MAX_DAYS = 400;
const FALLBACK_DAY_LIMITS = [MAX_DAYS, 120, 30] as const;
/** Lotes recentes já contados (sessão gravada ao concluir e de novo ao sair não conta dobrado). */
const MAX_RECENT_SOURCES = 100;
const MAX_SOURCE_LENGTH = 96;

export const LOGGED_ACTIVITIES: readonly ActivityId[] = ["scrolls", "reflexes", "exam", "seals", "brush"];

export interface ActivityDay {
  /** Dia local (`localDayNumber`). */
  day: number;
  counts: Partial<Record<ActivityId, number>>;
}

export interface ActivityLog {
  /** Do dia mais recente para o mais antigo, sem dias repetidos. */
  days: readonly ActivityDay[];
  recentSources: readonly string[];
}

export const EMPTY_ACTIVITY_LOG: ActivityLog = { days: [], recentSources: [] };

export interface ActivityEntry {
  activity: ActivityId;
  amount: number;
  day: number;
  /** Id da sessão/partida: a mesma não conta duas vezes. */
  sourceId: string;
}

/** Puro: devolve o mesmo objeto quando nada muda (quantidade zero ou lote repetido). */
export function applyActivity(log: ActivityLog, { activity, amount, day, sourceId }: ActivityEntry): ActivityLog {
  const source = `${activity}:${sourceId}`.slice(0, MAX_SOURCE_LENGTH);
  if (!(amount > 0) || !Number.isInteger(day) || log.recentSources.includes(source)) return log;

  const existing = log.days.find((entry) => entry.day === day);
  const updated: ActivityDay = {
    day,
    counts: { ...existing?.counts, [activity]: (existing?.counts[activity] ?? 0) + Math.floor(amount) },
  };
  const days = [updated, ...log.days.filter((entry) => entry.day !== day)].sort((a, b) => b.day - a.day);

  return { days, recentSources: [source, ...log.recentSources].slice(0, MAX_RECENT_SOURCES) };
}

export function countsForDay(log: ActivityLog, day: number): Partial<Record<ActivityId, number>> {
  return log.days.find((entry) => entry.day === day)?.counts ?? {};
}

function isActive(day: ActivityDay) {
  return Object.values(day.counts).some((count) => (count ?? 0) > 0);
}

export interface Streak {
  /** Dias seguidos até hoje (ou até ontem, se hoje ainda não teve treino: a sequência só quebra amanhã). */
  current: number;
  best: number;
  activeToday: boolean;
}

export function computeStreak(log: ActivityLog, today: number): Streak {
  const active = new Set(log.days.filter(isActive).map((entry) => entry.day));
  const activeToday = active.has(today);

  let current = 0;
  for (let day = activeToday ? today : today - 1; active.has(day); day -= 1) current += 1;

  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of [...active].sort((a, b) => a - b)) {
    run = previous != null && day === previous + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }

  return { current, best: Math.max(best, current), activeToday };
}

export function sanitizeActivityLog(raw: unknown): ActivityLog {
  if (!isRecord(raw)) return EMPTY_ACTIVITY_LOG;

  const seen = new Set<number>();
  const days: ActivityDay[] = [];
  for (const entry of Array.isArray(raw.days) ? raw.days : []) {
    if (!isRecord(entry) || typeof entry.day !== "number" || !Number.isInteger(entry.day) || seen.has(entry.day) || !isRecord(entry.counts)) continue;
    const counts: Partial<Record<ActivityId, number>> = {};
    for (const activity of LOGGED_ACTIVITIES) {
      const value = entry.counts[activity];
      if (isFiniteNumber(value) && value > 0) counts[activity] = Math.floor(value);
    }
    seen.add(entry.day);
    days.push({ day: entry.day, counts });
  }

  return {
    days: days.sort((a, b) => b.day - a.day).slice(0, MAX_DAYS),
    recentSources: Array.isArray(raw.recentSources)
      ? raw.recentSources.filter((source): source is string => typeof source === "string" && source.length <= MAX_SOURCE_LENGTH).slice(0, MAX_RECENT_SOURCES)
      : [],
  };
}

export function loadActivityLog(): ActivityLog {
  const stored = readJson(STORAGE_KEY);
  if (!isRecord(stored) || stored.version !== STORAGE_VERSION) return EMPTY_ACTIVITY_LOG;
  return sanitizeActivityLog(stored);
}

/** Se a quota estourar, tenta de novo guardando só os dias mais recentes (a sequência atual fica). */
export function saveActivityLog(log: ActivityLog): boolean {
  function* payloads() {
    for (const limit of FALLBACK_DAY_LIMITS) {
      yield JSON.stringify({ version: STORAGE_VERSION, days: log.days.slice(0, limit), recentSources: log.recentSources });
    }
  }
  return writeFirstThatFits(STORAGE_KEY, payloads());
}

/**
 * Soma a prática de uma sessão ao dia local de `now`. O fuso entra por parâmetro (testes usam
 * fusos sintéticos); no app é o do sistema. `true` também quando não havia nada a gravar.
 */
export function recordActivity(
  activity: ActivityId,
  amount: number,
  { sourceId, now, offsetAt = systemUtcOffset }: { sourceId: string; now: number; offsetAt?: UtcOffsetFn }
): boolean {
  const current = loadActivityLog();
  const next = applyActivity(current, { activity, amount, day: localDayNumber(now, offsetAt), sourceId });
  return next === current ? true : saveActivityLog(next);
}
