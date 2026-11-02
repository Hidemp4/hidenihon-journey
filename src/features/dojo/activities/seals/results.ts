import type { MasteryOutcome, MasteryResult } from "@/features/dojo/shared/mastery";
import { MAX_STARS, STAR_MOVES_PER_PAIR } from "./constants";
import type { SealsBest, SealsBoard } from "./types";

export function starsFor(moves: number, pairs: number): number {
  if (moves <= pairs * STAR_MOVES_PER_PAIR.three) return MAX_STARS;
  if (moves <= pairs * STAR_MOVES_PER_PAIR.two) return 2;
  return 1;
}

/** Maior número de jogadas que ainda dá 3 estrelas (o resultado mostra a meta). */
export function movesForThreeStars(pairs: number): number {
  return Math.floor(pairs * STAR_MOVES_PER_PAIR.three);
}

export function elapsedMs(board: Pick<SealsBoard, "startedAt" | "finishedAt">, now: number): number {
  if (board.startedAt == null) return 0;
  return Math.max(0, Math.round((board.finishedAt ?? now) - board.startedAt));
}

/** Segundos inteiros do cronômetro (o mesmo arredondamento no placar, no resultado e no anúncio). */
export function elapsedSeconds(ms: number): number {
  return Math.floor(ms / 1000);
}

/** Resultado de uma mesa completa, no formato do recorde. */
export function boardResult(board: SealsBoard, finishedAt: number): SealsBest {
  return { moves: board.moves, ms: elapsedMs(board, board.finishedAt ?? 0), stars: starsFor(board.moves, board.pairs.length), finishedAt };
}

/** Menos jogadas vence; empate, ganha quem foi mais rápido. */
export function isBetterResult(candidate: Pick<SealsBest, "moves" | "ms">, current: Pick<SealsBest, "moves" | "ms"> | null): boolean {
  if (current == null) return true;
  return candidate.moves < current.moves || (candidate.moves === current.moves && candidate.ms < current.ms);
}

/**
 * O que a partida ensina ao domínio, por par: formado sem tropeço = acerto; errado tendo visto o
 * parceiro = erro (mesmo que forme depois). Tempo não entra: aqui ele mede memória, não leitura.
 * Hiragana ↔ katakana conta para os dois kana do par.
 */
export function boardToMasteryResults(board: Pick<SealsBoard, "pairs" | "matchedPairIds" | "slippedPairIds">): MasteryResult[] {
  const matched = new Set(board.matchedPairIds);
  const slipped = new Set(board.slippedPairIds);

  return board.pairs.flatMap((pair) => {
    if (!matched.has(pair.id) && !slipped.has(pair.id)) return [];
    const outcome: MasteryOutcome = slipped.has(pair.id) ? "wrong" : "correct";
    return pair.items.map((item) => ({ itemId: item.id, outcome }));
  });
}
