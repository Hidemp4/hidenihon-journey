import { createRng } from "@/features/dojo/shared/components/arena/rng";
import { toggleGroupSelection } from "@/features/dojo/shared/kanaDeck";
import { DEFAULT_SEALS_SETTINGS, getBoardSize } from "./constants";
import { groupsKey } from "@/features/dojo/shared/content";
import { contentSelection, dealCards, pairWeight, pickPairs, sealsConfigKey } from "./pairs";
import type { SealPair, SealsBest, SealsBoard, SealsSettings } from "./types";

export type SealsGame =
  | { screen: "lobby" }
  | { screen: "playing"; board: SealsBoard }
  /** Mesa completa: o resultado aparece por cima e o tabuleiro fica à mostra, todo carimbado. */
  | { screen: "won"; board: SealsBoard };

export interface SealsState {
  settings: SealsSettings;
  game: SealsGame;
}

/**
 * O que é aleatório entra como `seed`, e o relógio como `now`: o reducer é puro,
 * a mesma ação monta sempre a mesma mesa (testável e seguro no StrictMode).
 */
export type SealsAction =
  | { type: "UPDATE_SETTINGS"; patch: Partial<SealsSettings> }
  | { type: "TOGGLE_GROUP"; groupId: string }
  | {
      type: "START";
      id: string;
      candidates: readonly SealPair[];
      weights: ReadonlyMap<string, number>;
      seed: number;
      /** Tela larga no momento do início (decide as colunas, que não mudam mais na partida). */
      wide: boolean;
      previousBest: SealsBest | null;
    }
  | { type: "FLIP"; index: number; now: number }
  | { type: "HIDE"; moveId: string }
  | { type: "ABANDON" }
  | { type: "CLOSE" };

export function createSealsState(settings: SealsSettings = DEFAULT_SEALS_SETTINGS): SealsState {
  return { settings: { ...settings, selectedGroupIds: [...settings.selectedGroupIds] }, game: { screen: "lobby" } };
}

interface CreateBoardInput {
  id: string;
  settings: SealsSettings;
  candidates: readonly SealPair[];
  weights: ReadonlyMap<string, number>;
  seed: number;
  wide: boolean;
  previousBest: SealsBest | null;
}

/** `null` quando o conteúdo não tem pares distintos suficientes para o tamanho escolhido. */
export function createBoard({ id, settings, candidates, weights, seed, wide, previousBest }: CreateBoardInput): SealsBoard | null {
  const size = getBoardSize(settings.sizeId);
  const rng = createRng(seed);
  const pairs = pickPairs(candidates, size.pairs, rng, (pair) => pairWeight(pair, weights));
  if (pairs.length < size.pairs) return null;

  const cards = dealCards(pairs, rng);
  return {
    id,
    configKey: sealsConfigKey(settings),
    pairType: settings.pairType,
    sizeId: size.id,
    columns: wide ? size.columns.wide : size.columns.narrow,
    pairs,
    cards,
    matchedPairIds: [],
    open: [],
    pendingMoveId: null,
    moves: 0,
    seen: cards.map(() => false),
    slippedPairIds: [],
    startedAt: null,
    finishedAt: null,
    lastEvent: null,
    previousBest,
  };
}

export function isBoardComplete(board: Pick<SealsBoard, "matchedPairIds" | "pairs">): boolean {
  return board.matchedPairIds.length === board.pairs.length;
}

function markSeen(seen: readonly boolean[], index: number): boolean[] {
  return seen.map((value, position) => value || position === index);
}

/**
 * Vira uma carta. Devolve `null` quando a virada não vale: carta inexistente, já aberta, já
 * carimbada, partida terminada ou um par errado ainda à mostra (o 3º clique fica bloqueado).
 */
export function flipCard(board: SealsBoard, index: number, now: number): SealsBoard | null {
  const card = board.cards[index];
  if (!card || board.pendingMoveId != null || board.finishedAt != null) return null;
  if (board.open.includes(index) || board.matchedPairIds.includes(card.pairId)) return null;

  const startedAt = board.startedAt ?? now;
  const seen = markSeen(board.seen, index);

  if (board.open.length === 0) {
    return { ...board, startedAt, seen, open: [index], lastEvent: { type: "flip", index } };
  }

  const first = board.open[0];
  const firstCard = board.cards[first];
  const moves = board.moves + 1;

  if (firstCard.pairId === card.pairId) {
    const matchedPairIds = [...board.matchedPairIds, card.pairId];
    const complete = matchedPairIds.length === board.pairs.length;
    return {
      ...board,
      startedAt,
      seen,
      moves,
      open: [],
      matchedPairIds,
      finishedAt: complete ? now : null,
      lastEvent: { type: "match", indices: [first, index] },
    };
  }

  // Errou. Se o parceiro da 1ª carta já tinha aparecido, quem lembrasse teria acertado:
  // isso conta como erro do item (esquecer ou não reconhecer). Errar carta ainda nunca vista é explorar.
  const partner = board.cards.find((other) => other.pairId === firstCard.pairId && other.index !== first);
  const slipped = partner != null && board.seen[partner.index] && !board.slippedPairIds.includes(firstCard.pairId);

  return {
    ...board,
    startedAt,
    seen,
    moves,
    open: [first, index],
    pendingMoveId: `${board.id}:${moves}`,
    slippedPairIds: slipped ? [...board.slippedPairIds, firstCard.pairId] : board.slippedPairIds,
    lastEvent: { type: "mismatch", indices: [first, index] },
  };
}

/** Desvira o par errado. Um aviso atrasado (de outra jogada ou de outra partida) é ignorado pelo id. */
export function hideMismatch(board: SealsBoard, moveId: string): SealsBoard | null {
  if (board.pendingMoveId == null || board.pendingMoveId !== moveId) return null;
  return { ...board, open: [], pendingMoveId: null };
}

export function sealsReducer(state: SealsState, action: SealsAction): SealsState {
  const { game, settings } = state;

  switch (action.type) {
    case "UPDATE_SETTINGS": {
      if (game.screen !== "lobby") return state;
      const next = { ...settings, ...action.patch };
      // Os grupos pertencem a um alfabeto: se o alfabeto do conteúdo muda, a seleção é limpa (igual à Arena).
      if (groupsKey(contentSelection(next)) !== groupsKey(contentSelection(settings)) && action.patch.selectedGroupIds === undefined) {
        next.selectedGroupIds = [];
      }
      return { ...state, settings: next };
    }

    case "TOGGLE_GROUP":
      if (game.screen !== "lobby") return state;
      return { ...state, settings: { ...settings, selectedGroupIds: toggleGroupSelection(settings.selectedGroupIds, action.groupId) } };

    case "START": {
      if (game.screen === "playing") return state;
      const board = createBoard({ ...action, settings });
      return board ? { ...state, game: { screen: "playing", board } } : state;
    }

    case "FLIP": {
      if (game.screen !== "playing") return state;
      const board = flipCard(game.board, action.index, action.now);
      if (!board) return state;
      return { ...state, game: isBoardComplete(board) ? { screen: "won", board } : { screen: "playing", board } };
    }

    case "HIDE": {
      if (game.screen !== "playing") return state;
      const board = hideMismatch(game.board, action.moveId);
      return board ? { ...state, game: { screen: "playing", board } } : state;
    }

    case "ABANDON":
      return game.screen === "playing" ? { ...state, game: { screen: "lobby" } } : state;

    case "CLOSE":
      return game.screen === "won" ? { ...state, game: { screen: "lobby" } } : state;

    default:
      return state;
  }
}
