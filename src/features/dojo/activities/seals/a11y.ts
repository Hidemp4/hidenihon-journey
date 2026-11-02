import { formatTimer } from "@/features/dojo/shared/format";
import { elapsedMs, elapsedSeconds } from "./results";
import type { SealsBoard } from "./types";

export type CardState = "hidden" | "open" | "matched";

export function cardState(board: Pick<SealsBoard, "cards" | "open" | "matchedPairIds">, index: number): CardState {
  const card = board.cards[index];
  if (card && board.matchedPairIds.includes(card.pairId)) return "matched";
  return board.open.includes(index) ? "open" : "hidden";
}

/** "Carta 5 de 12, virada: あ". A face só entra no rótulo quando está à mostra (senão o leitor de tela entregaria o jogo). */
export function cardLabel(board: Pick<SealsBoard, "cards" | "open" | "matchedPairIds">, index: number): string {
  const card = board.cards[index];
  const position = `Carta ${index + 1} de ${board.cards.length}`;
  const state = cardState(board, index);
  if (!card || state === "hidden") return `${position}, virada para baixo`;
  return state === "open" ? `${position}, virada: ${card.face.text}` : `${position}, selo carimbado: ${card.face.text}`;
}

function faceAt(board: Pick<SealsBoard, "cards">, index: number) {
  return board.cards[index]?.face.text ?? "";
}

/**
 * Texto da região live depois de cada jogada. Mudar o `aria-label` do botão focado nem sempre é lido de
 * novo, então a face virada também é anunciada aqui (com o número da carta, para o texto nunca se repetir igual).
 */
export function describeSealEvent(board: SealsBoard): string {
  const event = board.lastEvent;
  if (!event) return "";

  if (event.type === "flip") return `Carta ${event.index + 1}: ${faceAt(board, event.index)}.`;

  const [first, second] = event.indices;
  const flipped = `Carta ${second + 1}: ${faceAt(board, second)}.`;
  if (event.type === "mismatch") return `${flipped} Não combinou com ${faceAt(board, first)}.`;

  const progress = `${board.matchedPairIds.length} de ${board.pairs.length} pares.`;
  const pair = `Par formado: ${faceAt(board, first)} e ${faceAt(board, second)}! ${progress}`;
  if (board.finishedAt == null) return `${flipped} ${pair}`;
  return `${flipped} ${pair} Todos os selos carimbados em ${board.moves} jogadas e ${formatTimer(elapsedSeconds(elapsedMs(board, 0)))}.`;
}
