import type { ActivityId } from "../registry";
import { leagueIndexFor, metaFor } from "./ladder";
import {
  DRAW_MARGIN,
  LEAGUES,
  LOSS_BASE,
  LOSS_DISTANCE_PENALTY,
  MAX_DIFFICULTY,
  MAX_LOSS,
  MAX_WIN,
  RANKED_ACTIVITIES,
  VARIETY_FACTOR,
  VOLUME_FACTOR,
  WIN_BASE,
  WIN_MARGIN_BONUS,
  type RankedActivityId,
} from "./rules";

/** Por que a sessão não valeu troféus. */
export type UnrankedReason = "self-graded" | "review" | "study" | "too-short";

/** O que uma atividade entrega ao fim de uma sessão (ver `summaries.ts`). */
export interface SessionSummary {
  activity: ActivityId;
  sessionId: string;
  /** Chegou ao resultado. Sair no meio = `false` (só pode empatar ou perder). */
  finished: boolean;
  /** Itens que contam volume: respostas, pares formados, caracteres, cartas. */
  items: number;
  /** XP de prática já calculado pela régua da atividade. */
  practiceXp: number;
  /** Vale o bônus de sessão concluída (concluiu com o mínimo de volume). */
  completed: boolean;
  /** Dados da partida; `null` quando a sessão nunca vale troféus (com o motivo). */
  ranked: RankedInput | null;
  unrankedReason?: Exclude<UnrankedReason, "too-short">;
}

export interface RankedInput {
  activity: RankedActivityId;
  /** 0–100. */
  performance: number;
  /** Itens diferentes na sessão. */
  distinct: number;
  /** Produto dos bônus de dificuldade (antes do teto). */
  difficulty: number;
}

export type MatchOutcome = "win" | "draw" | "loss";

export interface MatchFactors {
  volume: number;
  variety: number;
  difficulty: number;
  lossFactor: number;
}

export type MatchResult =
  | {
      ranked: true;
      outcome: MatchOutcome;
      /** Troféus de fato aplicados (a derrota não passa do zero). */
      trophies: number;
      performance: number;
      meta: number;
      factors: MatchFactors;
    }
  | { ranked: false; reason: UnrankedReason };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Pontua uma sessão contra a meta de quem tem `trophies` troféus. Puro. */
export function scoreMatch(summary: Pick<SessionSummary, "finished" | "items" | "ranked" | "unrankedReason">, trophies: number): MatchResult {
  const { ranked } = summary;
  if (!ranked) return { ranked: false, reason: summary.unrankedReason ?? "self-graded" };

  const rules = RANKED_ACTIVITIES[ranked.activity];
  if (summary.items < rules.minItems) return { ranked: false, reason: "too-short" };

  const current = Math.max(0, Math.floor(trophies));
  const performance = Math.round(clamp(ranked.performance, 0, 100));
  const meta = metaFor(current);
  const factors: MatchFactors = {
    volume: clamp(summary.items / rules.referenceItems, VOLUME_FACTOR.min, VOLUME_FACTOR.max),
    variety: rules.fullVariety == null ? 1 : clamp(ranked.distinct / rules.fullVariety, VARIETY_FACTOR.min, VARIETY_FACTOR.max),
    difficulty: clamp(ranked.difficulty, 1, MAX_DIFFICULTY),
    lossFactor: LEAGUES[leagueIndexFor(current)].lossFactor,
  };

  // Sair no meio nunca vence: o que seria vitória vira empate.
  if (performance >= meta && summary.finished) {
    const raw = (WIN_BASE + (WIN_MARGIN_BONUS * (performance - meta)) / (100 - meta)) * factors.volume * factors.variety * factors.difficulty;
    return { ranked: true, outcome: "win", trophies: clamp(Math.round(raw), 1, MAX_WIN), performance, meta, factors };
  }

  if (performance >= meta - DRAW_MARGIN) return { ranked: true, outcome: "draw", trophies: 0, performance, meta, factors };

  const floor = meta - DRAW_MARGIN;
  const raw = (LOSS_BASE + (LOSS_DISTANCE_PENALTY * (floor - performance)) / floor) * factors.volume * factors.lossFactor;
  const loss = clamp(Math.round(raw), 1, MAX_LOSS);
  // Com 0 troféus a derrota entra nas estatísticas, mas não há o que tirar.
  return { ranked: true, outcome: "loss", trophies: current > 0 ? -Math.min(loss, current) : 0, performance, meta, factors };
}
