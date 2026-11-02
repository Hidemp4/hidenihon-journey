import { createMasteryRecord, type MasteryRecord } from "@/features/dojo/shared/mastery";
import { getKanaStudyItems } from "@/features/dojo/shared/studyItem";
import { SAO_PAULO } from "@/features/dojo/shared/test/zones";
import { buildReviewQueue } from "./queue";
import { createScrollsState, scrollsReducer, type ScrollsAction, type ScrollsState } from "./scrollsReducer";
import type { ScrollCard, ScrollGrade } from "./types";

export const HIRAGANA = getKanaStudyItems("hiragana");
/** 31/10/2026 12:00 em São Paulo. */
export const NOON = Date.UTC(2026, 9, 31, 15);
export const DAY = 86_400_000;

export function record(overrides: Partial<MasteryRecord> = {}): MasteryRecord {
  return { ...createMasteryRecord(), seen: 1, ...overrides };
}

export function run(state: ScrollsState, ...actions: ScrollsAction[]) {
  return actions.reduce(scrollsReducer, state);
}

/** Sessão de revisão com as `count` primeiras cartas novas do hiragana, começando ao meio-dia. */
export function startSession(count: number, mode: "review" | "free" = "review", cards?: ScrollCard[]) {
  const queue =
    cards ??
    buildReviewQueue({
      items: HIRAGANA.slice(0, count),
      records: {},
      now: NOON,
      newPerDay: count,
      introducedToday: 0,
    });
  return run(createScrollsState(), { type: "START", id: "sessao-1", mode, cards: queue, now: NOON, offsetAt: SAO_PAULO });
}

export function current(state: ScrollsState) {
  if (state.game.screen !== "session") throw new Error(`esperava sessão, veio ${state.game.screen}`);
  const card = state.game.session.queue[0];
  if (!card) throw new Error("fila vazia");
  return card;
}

/** Vira e dá a nota na carta da mesa. */
export function flipAndGrade(state: ScrollsState, grade: ScrollGrade, at = NOON) {
  const card = current(state);
  return run(state, { type: "FLIP", cardKey: card.key, now: at }, { type: "GRADE", cardKey: card.key, grade, now: at + 1_000 });
}
