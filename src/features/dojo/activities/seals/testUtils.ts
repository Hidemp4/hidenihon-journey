import { buildSealPairs } from "./pairs";
import { createSealsState, sealsReducer, type SealsAction, type SealsState } from "./sealsReducer";
import type { SealsBoard, SealsSettings } from "./types";

export function run(state: SealsState, ...actions: SealsAction[]) {
  return actions.reduce(sealsReducer, state);
}

export function startSeals(settings: Partial<SealsSettings> = {}, seed = 1, wide = false) {
  const state = run(createSealsState(), { type: "UPDATE_SETTINGS", patch: settings });
  return run(state, {
    type: "START",
    id: "mesa-1",
    candidates: buildSealPairs(state.settings),
    weights: new Map(),
    seed,
    wide,
    previousBest: null,
  });
}

export function boardOf(state: SealsState): SealsBoard {
  if (state.game.screen === "lobby") throw new Error("esperava uma mesa, veio o lobby");
  return state.game.board;
}

export function partnerIndex(board: SealsBoard, index: number): number {
  const card = board.cards[index];
  const partner = board.cards.find((other) => other.pairId === card.pairId && other.index !== index);
  if (!partner) throw new Error(`carta ${index} sem par`);
  return partner.index;
}

/** As duas posições de cada par, na ordem em que aparecem na mesa. */
export function pairPositions(board: SealsBoard): Array<[number, number]> {
  const done = new Set<string>();
  return board.cards.flatMap((card) => {
    if (done.has(card.pairId)) return [];
    done.add(card.pairId);
    return [[card.index, partnerIndex(board, card.index)] as [number, number]];
  });
}

/** Primeira carta que não é par de `index` (para forçar um erro). */
export function wrongPartner(board: SealsBoard, index: number): number {
  const wrong = board.cards.find((card) => card.pairId !== board.cards[index].pairId);
  if (!wrong) throw new Error("mesa sem cartas de outro par");
  return wrong.index;
}

export function flip(state: SealsState, index: number, now = 1_000) {
  return run(state, { type: "FLIP", index, now });
}
