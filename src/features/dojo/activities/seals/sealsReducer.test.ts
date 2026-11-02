import { describe, expect, it } from "vitest";
import { getKanaStudyItems } from "@/features/dojo/shared/studyItem";
import { BOARD_SIZES } from "./constants";
import { kanaRomajiPairs } from "./pairs";
import { boardToMasteryResults } from "./results";
import { createSealsState, isBoardComplete } from "./sealsReducer";
import { boardOf, flip, pairPositions, partnerIndex, run, startSeals, wrongPartner } from "./testUtils";

describe("Selos: montar a mesa", () => {
  it.each(BOARD_SIZES.map((size) => [size.id, size.pairs, size.columns] as const))("%s tem %i pares, sem par órfão nem duplicado", (sizeId, pairs, columns) => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const board = boardOf(startSeals({ sizeId, alphabet: "mixed" }, seed));
      expect(board.pairs).toHaveLength(pairs);
      expect(board.cards).toHaveLength(pairs * 2);
      // Cada par aparece exatamente duas vezes e nenhum texto se repete na mesa.
      for (const pair of board.pairs) expect(board.cards.filter((card) => card.pairId === pair.id)).toHaveLength(2);
      expect(new Set(board.cards.map((card) => card.face.text)).size).toBe(pairs * 2);
      expect(board.columns).toBe(columns.narrow);
    }
    expect(boardOf(startSeals({ sizeId }, 1, true)).columns).toBe(columns.wide);
  });

  it("linhas sempre completas, em pé e deitado", () => {
    for (const size of BOARD_SIZES) {
      expect((size.pairs * 2) % size.columns.narrow).toBe(0);
      expect((size.pairs * 2) % size.columns.wide).toBe(0);
    }
  });

  it("começa com tudo virado para baixo e o cronômetro parado", () => {
    const board = boardOf(startSeals());
    expect(board).toMatchObject({ open: [], matchedPairIds: [], moves: 0, startedAt: null, finishedAt: null, pendingMoveId: null });
    expect(board.seen.every((value) => !value)).toBe(true);
  });

  it("é determinístico pela semente", () => {
    expect(boardOf(startSeals({}, 42)).cards).toEqual(boardOf(startSeals({}, 42)).cards);
    expect(boardOf(startSeals({}, 42)).cards).not.toEqual(boardOf(startSeals({}, 43)).cards);
  });

  it("não começa se o conteúdo não enche o tabuleiro", () => {
    const state = startSeals({ sizeId: "4x4", selectedGroupIds: ["hiragana:ya-row"] });
    expect(state.game.screen).toBe("lobby");
  });

  it("aceita candidatos injetados (teste/kanji no futuro)", () => {
    const candidates = kanaRomajiPairs(getKanaStudyItems("hiragana").slice(0, 6));
    const state = run(createSealsState(), { type: "START", id: "x", candidates, weights: new Map(), seed: 1, wide: false, previousBest: null });
    expect(new Set(boardOf(state).pairs.map((pair) => pair.id))).toEqual(new Set(candidates.map((pair) => pair.id)));
  });
});

describe("Selos: regras da jogada", () => {
  it("a 1ª virada liga o cronômetro; formar par conta 1 jogada e deixa aberto", () => {
    const start = startSeals();
    const [[a, b]] = pairPositions(boardOf(start));

    const one = flip(start, a, 5_000);
    expect(boardOf(one)).toMatchObject({ open: [a], startedAt: 5_000, moves: 0, lastEvent: { type: "flip", index: a } });

    const two = flip(one, b, 6_000);
    const board = boardOf(two);
    expect(board).toMatchObject({ open: [], moves: 1, startedAt: 5_000, pendingMoveId: null, lastEvent: { type: "match", indices: [a, b] } });
    expect(board.matchedPairIds).toEqual([board.cards[a].pairId]);
  });

  it("errou: as duas ficam à mostra e o 3º clique é bloqueado até desvirar", () => {
    const start = startSeals();
    const first = 0;
    const second = wrongPartner(boardOf(start), first);
    const third = boardOf(start).cards.findIndex((card) => card.index !== first && card.index !== second);

    const missed = run(start, { type: "FLIP", index: first, now: 1 }, { type: "FLIP", index: second, now: 2 });
    const board = boardOf(missed);
    expect(board).toMatchObject({ open: [first, second], moves: 1, pendingMoveId: "mesa-1:1", lastEvent: { type: "mismatch" } });

    // Bloqueado: o estado é o mesmo objeto (nada mudou).
    expect(flip(missed, third, 3)).toBe(missed);

    // Aviso atrasado de outra jogada não fecha esta.
    expect(run(missed, { type: "HIDE", moveId: "mesa-1:0" })).toBe(missed);
    expect(run(missed, { type: "HIDE", moveId: "outra-mesa:1" })).toBe(missed);

    const hidden = run(missed, { type: "HIDE", moveId: "mesa-1:1" });
    expect(boardOf(hidden)).toMatchObject({ open: [], pendingMoveId: null, moves: 1 });
    expect(run(hidden, { type: "HIDE", moveId: "mesa-1:1" })).toBe(hidden);

    expect(boardOf(flip(hidden, third, 4)).open).toEqual([third]);
  });

  it("ignora virar a mesma carta duas vezes, uma carta carimbada ou um índice inválido", () => {
    const start = startSeals();
    const [[a, b]] = pairPositions(boardOf(start));
    const one = flip(start, a);
    expect(flip(one, a)).toBe(one);
    expect(flip(start, -1)).toBe(start);
    expect(flip(start, 99)).toBe(start);

    const matched = flip(one, b);
    expect(flip(matched, a)).toBe(matched);
    expect(flip(matched, b)).toBe(matched);
  });

  it("detecta a vitória no último par e para o cronômetro ali", () => {
    let state = startSeals({ sizeId: "3x4" });
    const positions = pairPositions(boardOf(state));
    positions.forEach(([a, b], turn) => {
      state = run(state, { type: "FLIP", index: a, now: 1_000 + turn * 100 }, { type: "FLIP", index: b, now: 1_050 + turn * 100 });
    });

    expect(state.game.screen).toBe("won");
    const board = boardOf(state);
    expect(isBoardComplete(board)).toBe(true);
    expect(board).toMatchObject({ moves: 6, startedAt: 1_000, finishedAt: 1_550 });
    // Mesa fechada: nada mais vira.
    expect(flip(state, 0, 9_999)).toBe(state);
  });

  it("separa explorar de esquecer: errar tendo visto o parceiro vira erro no domínio", () => {
    let state = startSeals({ sizeId: "3x4" });
    const board = boardOf(state);
    const [[x1, x2], [y1, y2]] = pairPositions(board);

    // Explorando: X e Y nunca vistos. Não é tropeço.
    state = run(state, { type: "FLIP", index: x1, now: 1 }, { type: "FLIP", index: y1, now: 2 });
    expect(boardOf(state).slippedPairIds).toEqual([]);
    state = run(state, { type: "HIDE", moveId: boardOf(state).pendingMoveId ?? "" });

    // Y2 aberto, e Y1 já foi visto: errar aqui é tropeço de Y.
    const other = boardOf(state).cards.find((card) => ![x1, x2, y1, y2].includes(card.index));
    if (!other) throw new Error("mesa pequena demais");
    state = run(state, { type: "FLIP", index: y2, now: 3 }, { type: "FLIP", index: other.index, now: 4 });
    const yPair = board.cards[y1].pairId;
    expect(boardOf(state).slippedPairIds).toEqual([yPair]);
    state = run(state, { type: "HIDE", moveId: boardOf(state).pendingMoveId ?? "" });

    // Forma X e Y: X conta acerto, Y conta erro (tropeçou antes de formar).
    state = run(state, { type: "FLIP", index: x1, now: 5 }, { type: "FLIP", index: x2, now: 6 });
    state = run(state, { type: "FLIP", index: y1, now: 7 }, { type: "FLIP", index: partnerIndex(board, y1), now: 8 });
    const results = boardToMasteryResults(boardOf(state));
    expect(results).toHaveLength(2);
    expect(results).toEqual(
      expect.arrayContaining([
        { itemId: board.cards[x1].pairId, outcome: "correct" },
        { itemId: yPair, outcome: "wrong" },
      ])
    );
  });
});

describe("Selos: telas", () => {
  it("Encerrar volta ao lobby; Concluir sai do resultado; Jogar de novo monta outra mesa", () => {
    const playing = startSeals();
    expect(run(playing, { type: "ABANDON" }).game.screen).toBe("lobby");
    expect(run(playing, { type: "CLOSE" })).toBe(playing);
    expect(run(playing, { type: "START", id: "outra", candidates: [], weights: new Map(), seed: 1, wide: false, previousBest: null })).toBe(playing);

    let won = playing;
    for (const [a, b] of pairPositions(boardOf(playing))) won = run(won, { type: "FLIP", index: a, now: 1 }, { type: "FLIP", index: b, now: 2 });
    expect(won.game.screen).toBe("won");
    expect(run(won, { type: "ABANDON" })).toBe(won);
    expect(run(won, { type: "CLOSE" }).game.screen).toBe("lobby");

    const again = run(won, { type: "START", id: "mesa-2", candidates: kanaRomajiPairs(getKanaStudyItems("hiragana")), weights: new Map(), seed: 7, wide: false, previousBest: null });
    expect(boardOf(again).id).toBe("mesa-2");
  });

  it("configurações só mudam no lobby; trocar o alfabeto do conteúdo limpa os grupos", () => {
    const withGroup = run(createSealsState(), { type: "TOGGLE_GROUP", groupId: "katakana:ka-a-row" }, { type: "UPDATE_SETTINGS", patch: { alphabet: "katakana" } });
    expect(withGroup.settings.selectedGroupIds).toEqual([]);

    const katakana = run(createSealsState(), { type: "UPDATE_SETTINGS", patch: { alphabet: "katakana" } }, { type: "TOGGLE_GROUP", groupId: "katakana:ka-a-row" });
    expect(katakana.settings.selectedGroupIds).toEqual(["katakana:ka-a-row"]);
    // Katakana → hiragana ↔ katakana: o conteúdo passa a ser hiragana, a seleção não vale mais.
    expect(run(katakana, { type: "UPDATE_SETTINGS", patch: { pairType: "hiragana-katakana" } }).settings.selectedGroupIds).toEqual([]);

    const hiragana = run(createSealsState(), { type: "TOGGLE_GROUP", groupId: "hiragana:ka-row" });
    // Hiragana → hiragana ↔ katakana: mesmo alfabeto de conteúdo, os grupos ficam.
    expect(run(hiragana, { type: "UPDATE_SETTINGS", patch: { pairType: "hiragana-katakana" } }).settings.selectedGroupIds).toEqual(["hiragana:ka-row"]);

    const playing = startSeals();
    expect(run(playing, { type: "UPDATE_SETTINGS", patch: { sizeId: "4x6" } })).toBe(playing);
    expect(run(playing, { type: "TOGGLE_GROUP", groupId: "hiragana:ka-row" })).toBe(playing);
  });
});
