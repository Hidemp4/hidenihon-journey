import { countsForDay, loadActivityLog } from "@/features/dojo/shared/activityLog";
import { localDayNumber, systemUtcOffset } from "@/features/dojo/shared/calendar";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadMastery } from "@/features/dojo/shared/mastery";
import { createMemoryStorage } from "@/features/dojo/shared/test/memoryStorage";
import { describeSealsBadge, getSealsBadge } from "./badge";
import { commitSealsGame, hasProgress } from "./commit";
import { loadSealsBests } from "./sealsRepository";
import { boardOf, pairPositions, run, startSeals } from "./testUtils";

function finishedBoard(settings: Parameters<typeof startSeals>[0] = {}) {
  let state = startSeals(settings);
  pairPositions(boardOf(state)).forEach(([a, b], turn) => {
    state = run(state, { type: "FLIP", index: a, now: turn * 1_000 }, { type: "FLIP", index: b, now: turn * 1_000 + 500 });
  });
  if (state.game.screen !== "won") throw new Error("deveria ter vencido");
  return state.game.board;
}

describe("gravação dos Selos", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mesa completa grava o domínio e o recorde, uma vez só", () => {
    const board = finishedBoard();
    expect(commitSealsGame(board, { finished: true, now: 77 })).toBe(true);
    expect(commitSealsGame(board, { finished: true, now: 88 })).toBe(true);
    expect(countsForDay(loadActivityLog(), localDayNumber(77, systemUtcOffset))).toEqual({ seals: 6 });

    const items = Object.values(loadMastery().items);
    expect(items).toHaveLength(6);
    expect(items.every((record) => record.seen === 1 && record.correct === 1)).toBe(true);
    expect(loadSealsBests()).toEqual({ "kana-romaji:hiragana:3x4": { moves: 6, ms: 5_500, stars: 3, finishedAt: 77 } });
    expect(getSealsBadge()).toEqual({ text: "Melhor 3×4: 6 jogadas", tone: "accent" });
  });

  it("hiragana ↔ katakana alimenta os dois alfabetos", () => {
    commitSealsGame(finishedBoard({ pairType: "hiragana-katakana" }), { finished: true, now: 1 });
    const ids = Object.keys(loadMastery().items);
    expect(ids.filter((id) => id.startsWith("hiragana:"))).toHaveLength(6);
    expect(ids.filter((id) => id.startsWith("katakana:"))).toHaveLength(6);
    expect(Object.keys(loadSealsBests())).toEqual(["hiragana-katakana:both:3x4"]);
  });

  it("partida abandonada vai para o domínio, mas não disputa recorde", () => {
    let state = startSeals();
    const [[a, b]] = pairPositions(boardOf(state));
    expect(hasProgress(boardOf(state))).toBe(false);
    state = run(state, { type: "FLIP", index: a, now: 1 }, { type: "FLIP", index: b, now: 2 });
    expect(hasProgress(boardOf(state))).toBe(true);

    commitSealsGame(boardOf(state), { finished: false, now: 3 });
    expect(Object.keys(loadMastery().items)).toHaveLength(1);
    expect(loadSealsBests()).toEqual({});
    expect(getSealsBadge()).toEqual({ text: "Nenhuma partida ainda", tone: "neutral" });
  });

  it("quota cheia: avisa (false), sem lançar", () => {
    vi.stubGlobal("localStorage", createMemoryStorage({ failOnSet: () => true }));
    expect(commitSealsGame(finishedBoard(), { finished: true, now: 1 })).toBe(false);
  });

  it("badge mostra o recorde mais recente", () => {
    expect(
      describeSealsBadge({
        "kana-romaji:hiragana:3x4": { moves: 9, ms: 1, stars: 3, finishedAt: 10 },
        "kana-romaji:mixed:4x6": { moves: 25, ms: 1, stars: 2, finishedAt: 20 },
      })
    ).toEqual({ text: "Melhor 4×6: 25 jogadas", tone: "accent" });
  });
});
