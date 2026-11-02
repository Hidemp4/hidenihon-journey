import { describe, expect, it } from "vitest";
import { getKanaStudyItems } from "@/features/dojo/shared/studyItem";
import { cardLabel, cardState, describeSealEvent } from "./a11y";
import { moveGridIndex } from "./gridNavigation";
import { hiraganaKatakanaPairs } from "./pairs";
import { boardResult, boardToMasteryResults, elapsedMs, isBetterResult, movesForThreeStars, starsFor } from "./results";
import { boardOf, flip, pairPositions, run, startSeals, wrongPartner } from "./testUtils";

describe("Selos: estrelas e recorde", () => {
  it("estrelas por jogadas por par (3 até 1,75; 2 até 2,5)", () => {
    expect([6, 10, 11, 15, 16].map((moves) => starsFor(moves, 6))).toEqual([3, 3, 2, 2, 1]);
    expect([12, 21, 22, 30, 31].map((moves) => starsFor(moves, 12))).toEqual([3, 3, 2, 2, 1]);
    expect(movesForThreeStars(6)).toBe(10);
    expect(movesForThreeStars(8)).toBe(14);
    expect(movesForThreeStars(12)).toBe(21);
  });

  it("menos jogadas vence; empate decide no tempo", () => {
    expect(isBetterResult({ moves: 9, ms: 90_000 }, { moves: 10, ms: 10_000 })).toBe(true);
    expect(isBetterResult({ moves: 10, ms: 9_000 }, { moves: 10, ms: 10_000 })).toBe(true);
    expect(isBetterResult({ moves: 10, ms: 10_000 }, { moves: 10, ms: 10_000 })).toBe(false);
    expect(isBetterResult({ moves: 11, ms: 1 }, { moves: 10, ms: 10_000 })).toBe(false);
    expect(isBetterResult({ moves: 30, ms: 1 }, null)).toBe(true);
  });

  it("tempo vai da 1ª virada ao último par", () => {
    expect(elapsedMs({ startedAt: null, finishedAt: null }, 5_000)).toBe(0);
    expect(elapsedMs({ startedAt: 1_000, finishedAt: null }, 5_000)).toBe(4_000);
    expect(elapsedMs({ startedAt: 1_000, finishedAt: 3_500 }, 99_000)).toBe(2_500);
    expect(elapsedMs({ startedAt: 1_000, finishedAt: null }, 500)).toBe(0);
  });

  it("resultado da mesa completa", () => {
    let state = startSeals();
    pairPositions(boardOf(state)).forEach(([a, b], turn) => {
      state = run(state, { type: "FLIP", index: a, now: 1_000 + turn * 1_000 }, { type: "FLIP", index: b, now: 1_500 + turn * 1_000 });
    });
    expect(boardResult(boardOf(state), 77)).toEqual({ moves: 6, ms: 5_500, stars: 3, finishedAt: 77 });
  });
});

describe("Selos: o que vai para o domínio", () => {
  it("hiragana ↔ katakana conta para os dois kana do par", () => {
    const [pair] = hiraganaKatakanaPairs(getKanaStudyItems("hiragana"), getKanaStudyItems("katakana"));
    expect(boardToMasteryResults({ pairs: [pair], matchedPairIds: [pair.id], slippedPairIds: [] })).toEqual([
      { itemId: "hiragana:あ", outcome: "correct" },
      { itemId: "katakana:ア", outcome: "correct" },
    ]);
  });

  it("par não formado só entra se houve tropeço (partida abandonada)", () => {
    const pairs = hiraganaKatakanaPairs(getKanaStudyItems("hiragana"), getKanaStudyItems("katakana")).slice(0, 3);
    const [a, b] = pairs;
    expect(boardToMasteryResults({ pairs, matchedPairIds: [a.id], slippedPairIds: [b.id] }).map((result) => `${result.itemId}=${result.outcome}`)).toEqual([
      "hiragana:あ=correct",
      "katakana:ア=correct",
      "hiragana:い=wrong",
      "katakana:イ=wrong",
    ]);
  });
});

describe("Selos: rótulos e anúncios", () => {
  it("o rótulo só mostra a face quando a carta está à mostra", () => {
    const start = startSeals();
    const [[a, b]] = pairPositions(boardOf(start));
    const face = boardOf(start).cards[a].face.text;

    expect(cardLabel(boardOf(start), a)).toBe(`Carta ${a + 1} de 12, virada para baixo`);
    const open = flip(start, a);
    expect(cardState(boardOf(open), a)).toBe("open");
    expect(cardLabel(boardOf(open), a)).toBe(`Carta ${a + 1} de 12, virada: ${face}`);
    const matched = flip(open, b);
    expect(cardLabel(boardOf(matched), a)).toBe(`Carta ${a + 1} de 12, selo carimbado: ${face}`);
  });

  it("anuncia a virada, o erro, o par e a vitória", () => {
    const start = startSeals();
    const board = boardOf(start);
    const text = (index: number) => board.cards[index].face.text;
    const positions = pairPositions(board);
    const [a, b] = positions[0];
    const miss = wrongPartner(board, a);

    expect(describeSealEvent(board)).toBe("");
    const one = flip(start, a);
    expect(describeSealEvent(boardOf(one))).toBe(`Carta ${a + 1}: ${text(a)}.`);
    const missed = flip(one, miss);
    expect(describeSealEvent(boardOf(missed))).toBe(`Carta ${miss + 1}: ${text(miss)}. Não combinou com ${text(a)}.`);

    const hidden = run(missed, { type: "HIDE", moveId: boardOf(missed).pendingMoveId ?? "" });
    const paired = run(hidden, { type: "FLIP", index: a, now: 1 }, { type: "FLIP", index: b, now: 2 });
    expect(describeSealEvent(boardOf(paired))).toBe(`Carta ${b + 1}: ${text(b)}. Par formado: ${text(a)} e ${text(b)}! 1 de 6 pares.`);

    let won = paired;
    positions.slice(1).forEach(([x, y]) => {
      won = run(won, { type: "FLIP", index: x, now: 30_000 }, { type: "FLIP", index: y, now: 65_000 });
    });
    expect(describeSealEvent(boardOf(won))).toMatch(/6 de 6 pares\. Todos os selos carimbados em 7 jogadas e 1:04\.$/);
  });
});

describe("Selos: navegação por setas", () => {
  // Mesa 4×3 (4 colunas, 12 cartas):
  //  0  1  2  3
  //  4  5  6  7
  //  8  9 10 11
  it("anda uma casa sem dar a volta nas bordas", () => {
    expect(moveGridIndex(5, "ArrowRight", 4, 12)).toBe(6);
    expect(moveGridIndex(7, "ArrowRight", 4, 12)).toBe(7);
    expect(moveGridIndex(4, "ArrowLeft", 4, 12)).toBe(4);
    expect(moveGridIndex(5, "ArrowLeft", 4, 12)).toBe(4);
    expect(moveGridIndex(5, "ArrowDown", 4, 12)).toBe(9);
    expect(moveGridIndex(9, "ArrowDown", 4, 12)).toBe(9);
    expect(moveGridIndex(1, "ArrowUp", 4, 12)).toBe(1);
    expect(moveGridIndex(9, "ArrowUp", 4, 12)).toBe(5);
  });

  it("Home/End vão às pontas da linha; com Ctrl, às pontas da mesa", () => {
    expect(moveGridIndex(6, "Home", 4, 12)).toBe(4);
    expect(moveGridIndex(6, "End", 4, 12)).toBe(7);
    expect(moveGridIndex(6, "Home", 4, 12, true)).toBe(0);
    expect(moveGridIndex(6, "End", 4, 12, true)).toBe(11);
  });

  it("outras teclas não são de navegação", () => {
    expect(moveGridIndex(0, "Enter", 4, 12)).toBeNull();
    expect(moveGridIndex(0, "a", 4, 12)).toBeNull();
    expect(moveGridIndex(0, "ArrowRight", 0, 12)).toBeNull();
  });
});
