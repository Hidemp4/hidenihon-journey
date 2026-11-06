import { recordActivity } from "@/features/dojo/shared/activityLog";
import { masteryStore } from "@/features/dojo/shared/mastery";
import { recordProgression } from "@/features/dojo/progression/store";
import { sealsSummary } from "@/features/dojo/progression/summaries";
import { boardResult, boardToMasteryResults } from "./results";
import { saveSealsBestIfBetter } from "./sealsRepository";
import type { SealsBoard } from "./types";

/**
 * Grava a partida. `finished`: mesa completa, disputa o recorde. Abandonada no meio, só o que já
 * aconteceu (pares formados e tropeços) vai para o domínio. Idempotente pelo id da mesa.
 */
export function commitSealsGame(board: SealsBoard, { finished, now }: { finished: boolean; now: number }): boolean {
  const savedMastery = masteryStore.recordResults(boardToMasteryResults(board), { sourceId: board.id, now });
  // Sequência e missão do dia: pares formados (partida abandonada também conta o que formou).
  const savedActivity = recordActivity("seals", board.matchedPairIds.length, { sourceId: board.id, now });
  // XP e troféus (depois da atividade do dia: a missão e a sequência já contam esta mesa).
  recordProgression(sealsSummary(board, finished && board.finishedAt != null), { now });
  if (!finished || board.finishedAt == null) return savedMastery && savedActivity;
  return saveSealsBestIfBetter(board.configKey, boardResult(board, now)) && savedMastery && savedActivity;
}

/** Vale gravar ao sair no meio? Só se já houve par formado ou tropeço. */
export function hasProgress(board: Pick<SealsBoard, "matchedPairIds" | "slippedPairIds">): boolean {
  return board.matchedPairIds.length > 0 || board.slippedPairIds.length > 0;
}
