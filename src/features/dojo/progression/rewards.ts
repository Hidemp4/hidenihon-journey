import type { ActivityId } from "../registry";
import { leagueIndexFor, levelFor } from "./ladder";
import { scoreMatch, type MatchOutcome, type MatchResult, type SessionSummary } from "./match";
import { DAILY_BONUS, LEAGUES, MISSION_COMPLETE_XP, MISSION_TASK_XP, RESULT_XP, SESSION_COMPLETE_XP } from "./rules";

/** Os números que o servidor também guarda (o ranking lê estes). */
export interface ProgressTotals {
  xp: number;
  trophies: number;
  /** Recorde de troféus (decide a recompensa de liga nova). */
  bestTrophies: number;
  wins: number;
  draws: number;
  losses: number;
}

export const EMPTY_TOTALS: ProgressTotals = { xp: 0, trophies: 0, bestTrophies: 0, wins: 0, draws: 0, losses: 0 };

export type XpSource = "practice" | "session" | "result" | "daily" | "mission-task" | "mission" | "league";

export interface XpLine {
  source: XpSource;
  label: string;
  xp: number;
}

/** O que uma sessão rendeu: aparece na tela de resultado e no histórico do ranking. */
export interface SessionReward {
  /** `atividade:idDaSessão`. */
  key: string;
  activity: ActivityId;
  /** Epoch em ms. */
  at: number;
  match: MatchResult;
  xp: number;
  xpLines: XpLine[];
  before: Pick<ProgressTotals, "xp" | "trophies">;
  after: Pick<ProgressTotals, "xp" | "trophies">;
  /** Novo nível, se subiu. */
  levelUp: number | null;
  /** Mudou de liga (índice em `LEAGUES`). */
  leagueChange: { from: number; to: number } | null;
}

/** O que vai para o servidor (um por sessão; o servidor ignora repetidos pela chave). */
export interface PendingResult {
  key: string;
  activity: ActivityId;
  xp: number;
  trophies: number;
  outcome: MatchOutcome | "unranked";
}

export interface RewardContext {
  /** Dia local da sessão. */
  day: number;
  /** Sequência de dias já contando hoje. */
  streak: number;
  /** Atividades cuja tarefa da missão de hoje está cumprida (depois desta sessão). */
  missionTasksDone: readonly ActivityId[];
  /** As 3 tarefas cumpridas. */
  missionComplete: boolean;
}

/** Marcas do que já foi premiado (bônus diário e missão), para não pagar duas vezes. */
export interface AwardMarks {
  dailyBonusDay: number | null;
  /** `dia:atividade` e `dia:all`. */
  missionAwards: readonly string[];
}

/** Só as marcas de missão dos últimos dias importam (um dia novo tem chaves novas). */
const MISSION_AWARD_DAYS = 3;

export function sessionKey(activity: ActivityId, sessionId: string) {
  return `${activity}:${sessionId}`;
}

/**
 * Aplica uma sessão: pontua a partida, soma o XP (prática + bônus) e devolve os novos totais.
 * Puro: o store cuida de gravar, deduplicar e enviar.
 */
export function applySession(
  totals: ProgressTotals,
  marks: AwardMarks,
  summary: SessionSummary,
  context: RewardContext,
  now: number
): { totals: ProgressTotals; marks: AwardMarks; reward: SessionReward; pending: PendingResult } {
  const match = scoreMatch(summary, totals.trophies);
  const lines: XpLine[] = [];
  const add = (source: XpSource, label: string, xp: number) => {
    if (xp > 0) lines.push({ source, label, xp: Math.round(xp) });
  };

  add("practice", "Prática", summary.practiceXp);
  if (summary.completed) add("session", "Sessão concluída", SESSION_COMPLETE_XP);
  if (match.ranked && match.outcome !== "loss") add("result", match.outcome === "win" ? "Vitória" : "Empate", RESULT_XP[match.outcome]);

  let dailyBonusDay = marks.dailyBonusDay;
  if (summary.practiceXp > 0 && dailyBonusDay !== context.day) {
    add("daily", "Primeiro treino do dia", DAILY_BONUS.base + Math.min(DAILY_BONUS.maxStreakBonus, DAILY_BONUS.perStreakDay * Math.max(0, context.streak)));
    dailyBonusDay = context.day;
  }

  const awarded = new Set(marks.missionAwards);
  const newAwards: string[] = [];
  for (const activity of context.missionTasksDone) {
    const mark = `${context.day}:${activity}`;
    if (awarded.has(mark)) continue;
    add("mission-task", "Tarefa da missão do dia", MISSION_TASK_XP);
    newAwards.push(mark);
  }
  const allMark = `${context.day}:all`;
  if (context.missionComplete && !awarded.has(allMark)) {
    add("mission", "Missão do dia completa", MISSION_COMPLETE_XP);
    newAwards.push(allMark);
  }

  const trophies = Math.max(0, totals.trophies + (match.ranked ? match.trophies : 0));
  const fromLeague = leagueIndexFor(totals.trophies);
  const toLeague = leagueIndexFor(trophies);
  // Liga nova = acima da melhor já alcançada (subir de novo depois de cair não paga outra vez).
  for (let index = leagueIndexFor(totals.bestTrophies) + 1; index <= toLeague; index += 1) {
    add("league", `Primeira vez na liga ${LEAGUES[index].name}`, LEAGUES[index].firstReachXp);
  }

  const xpGained = lines.reduce((sum, line) => sum + line.xp, 0);
  const next: ProgressTotals = {
    xp: totals.xp + xpGained,
    trophies,
    bestTrophies: Math.max(totals.bestTrophies, trophies),
    wins: totals.wins + (match.ranked && match.outcome === "win" ? 1 : 0),
    draws: totals.draws + (match.ranked && match.outcome === "draw" ? 1 : 0),
    losses: totals.losses + (match.ranked && match.outcome === "loss" ? 1 : 0),
  };

  const levelBefore = levelFor(totals.xp).level;
  const levelAfter = levelFor(next.xp).level;
  const key = sessionKey(summary.activity, summary.sessionId);

  return {
    totals: next,
    marks: {
      dailyBonusDay,
      missionAwards: [...newAwards, ...marks.missionAwards].filter((mark) => Number(mark.split(":")[0]) > context.day - MISSION_AWARD_DAYS),
    },
    reward: {
      key,
      activity: summary.activity,
      at: now,
      match,
      xp: xpGained,
      xpLines: lines,
      before: { xp: totals.xp, trophies: totals.trophies },
      after: { xp: next.xp, trophies: next.trophies },
      levelUp: levelAfter > levelBefore ? levelAfter : null,
      leagueChange: toLeague !== fromLeague ? { from: fromLeague, to: toLeague } : null,
    },
    pending: {
      key,
      activity: summary.activity,
      xp: xpGained,
      trophies: next.trophies - totals.trophies,
      outcome: match.ranked ? match.outcome : "unranked",
    },
  };
}

/** Soma resultados ainda não enviados aos totais do servidor (o que se vê enquanto não sincroniza). */
export function totalsWithPending(server: ProgressTotals, pending: readonly PendingResult[]): ProgressTotals {
  return pending.reduce<ProgressTotals>((acc, item) => {
    const trophies = Math.max(0, acc.trophies + item.trophies);
    return {
      xp: acc.xp + item.xp,
      trophies,
      bestTrophies: Math.max(acc.bestTrophies, trophies),
      wins: acc.wins + (item.outcome === "win" ? 1 : 0),
      draws: acc.draws + (item.outcome === "draw" ? 1 : 0),
      losses: acc.losses + (item.outcome === "loss" ? 1 : 0),
    };
  }, server);
}
