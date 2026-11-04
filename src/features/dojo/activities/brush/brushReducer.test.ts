import { describe, expect, it } from "vitest";
import { createRng } from "@/features/dojo/shared/components/arena/rng";
import { createBrushState } from "./brushReducer";
import { traceFeedbackMessage, summarizeBrushSession } from "./messages";
import { buildBrushCards } from "./queue";
import { BOTTOM, HIRAGANA, TOP, draw, keyOf, line, run, sessionOf, startBrush, syntheticGlyph, testCards } from "./testUtils";

describe("Pincel: Traçar", () => {
  it("traços certos na ordem completam o kana com nota; Próximo grava acerto", () => {
    let state = draw(startBrush("trace"), TOP);
    expect(sessionOf(state)).toMatchObject({ phase: "drawing", feedback: { strokeIndex: 0, verdict: { kind: "ok" }, attempt: 1 } });
    expect(sessionOf(state).strokes).toHaveLength(1);

    state = draw(state, BOTTOM);
    const session = sessionOf(state);
    expect(session.phase).toBe("checked");
    expect(session.score).toMatchObject({ score: 100, strokeCount: 2, expectedStrokes: 2 });
    expect(traceFeedbackMessage(session.cards[0], session.feedback)).toBe("あ: traço 2 de 2 certo. Kana completo!");

    state = run(state, { type: "NEXT", cardKey: keyOf(state) });
    expect(sessionOf(state).index).toBe(1);
    expect(sessionOf(state).attempts[0]).toMatchObject({ outcome: "correct", corrections: 0, orderErrors: 0 });
    expect(sessionOf(state).strokes).toEqual([]);
  });

  it("direção invertida e ordem errada são recusadas e contam como erro do kana", () => {
    let state = draw(startBrush("trace"), [...TOP].reverse());
    const card = sessionOf(state).cards[0];
    expect(sessionOf(state)).toMatchObject({ corrections: 1, orderErrors: 1, strokes: [], feedback: { verdict: { kind: "reversed" }, attempt: 1 } });
    expect(traceFeedbackMessage(card, sessionOf(state).feedback)).toBe("あ: traço 1 de 2 na direção contrária. Comece do outro lado.");

    state = draw(state, BOTTOM);
    expect(sessionOf(state).feedback).toMatchObject({ verdict: { kind: "wrong-order", matched: 1 }, attempt: 2 });
    expect(traceFeedbackMessage(card, sessionOf(state).feedback)).toBe("あ: esse é o traço 2. Agora é o traço 1 de 2 (2ª tentativa).");

    state = draw(state, TOP, BOTTOM);
    state = run(state, { type: "NEXT", cardKey: keyOf(state) });
    expect(sessionOf(state).attempts[0]).toMatchObject({ outcome: "wrong", corrections: 2, orderErrors: 2 });
  });

  it("forma recusada conta correção, mas não derruba o acerto (depende da mão e da tela)", () => {
    let state = draw(startBrush("trace"), line(50, 0, 50, 109));
    expect(sessionOf(state).feedback?.verdict).toEqual({ kind: "shape" });
    expect(traceFeedbackMessage(sessionOf(state).cards[0], sessionOf(state).feedback)).toBe("あ: não parece o traço 1 de 2. Siga o guia laranja.");
    state = draw(state, TOP, BOTTOM);
    state = run(state, { type: "NEXT", cardKey: keyOf(state) });
    expect(sessionOf(state).attempts[0]).toMatchObject({ outcome: "correct", corrections: 1, orderErrors: 0 });
  });

  it("toque não conta; refazer o traço já feito é apontado", () => {
    const start = startBrush("trace");
    expect(draw(start, [{ x: 50, y: 50 }])).toBe(start);
    const state = draw(start, TOP, TOP);
    expect(sessionOf(state).feedback).toMatchObject({ verdict: { kind: "wrong-order", matched: 0 } });
    expect(traceFeedbackMessage(sessionOf(state).cards[0], sessionOf(state).feedback)).toMatch(/esse é o traço 1, que já está feito\. Agora é o traço 2 de 2/);
  });

  it("desfazer e limpar só enquanto desenha; ações de carta antiga são ignoradas", () => {
    let state = draw(startBrush("trace"), TOP);
    state = run(state, { type: "UNDO", cardKey: keyOf(state) });
    expect(sessionOf(state).strokes).toEqual([]);
    expect(run(state, { type: "UNDO", cardKey: keyOf(state) })).toBe(state);

    state = draw(state, TOP);
    state = run(state, { type: "CLEAR", cardKey: keyOf(state) });
    expect(sessionOf(state).strokes).toEqual([]);

    const done = draw(state, TOP, BOTTOM);
    expect(run(done, { type: "UNDO", cardKey: keyOf(done) })).toBe(done);
    expect(run(done, { type: "STROKE", cardKey: keyOf(done), points: TOP })).toBe(done);

    const oldKey = keyOf(state);
    const skipped = run(state, { type: "SKIP", cardKey: oldKey });
    expect(sessionOf(skipped).index).toBe(1);
    expect(sessionOf(skipped).attempts).toEqual([]);
    expect(run(skipped, { type: "STROKE", cardKey: oldKey, points: TOP })).toBe(skipped);
    expect(run(skipped, { type: "SKIP", cardKey: oldKey })).toBe(skipped);
  });
});

describe("Pincel: De memória", () => {
  it("aceita qualquer traço (menos toque), confere encaixando no modelo e grava a autoavaliação", () => {
    let state = startBrush("recall");
    expect(draw(state, [{ x: 1, y: 1 }])).toBe(state);
    // Desenho quase certo, pequeno e no canto: o encaixe corrige tamanho e posição antes da nota.
    state = draw(state, line(10, 17, 44, 17), line(5, 40, 49, 40));
    expect(sessionOf(state).feedback).toBeNull();
    expect(run(state, { type: "GRADE", cardKey: keyOf(state), grade: "good" })).toBe(state);

    state = run(state, { type: "CHECK", cardKey: keyOf(state) });
    expect(sessionOf(state).phase).toBe("checked");
    // Não é a metade exata do modelo (meia unidade fora): nota alta, mas a nota não tem folga.
    expect(sessionOf(state).score?.score).toBeGreaterThanOrEqual(85);
    expect(sessionOf(state).score?.score).toBeLessThan(100);
    expect(run(state, { type: "STROKE", cardKey: keyOf(state), points: TOP })).toBe(state);

    state = run(state, { type: "GRADE", cardKey: keyOf(state), grade: "almost" });
    expect(sessionOf(state).attempts[0]).toMatchObject({ grade: "almost", outcome: "correct" });
  });

  it("a metade exata do modelo, encaixada, é idêntica: 100", () => {
    let state = draw(startBrush("recall"), line(10, 17.5, 44.5, 17.5), line(5, 40, 49.5, 40));
    state = run(state, { type: "CHECK", cardKey: keyOf(state) });
    expect(sessionOf(state).score).toMatchObject({ score: 100, error: 0 });
  });

  it("conferir sem desenhar vale (só teclado) e 'Errei' grava erro", () => {
    let state = run(startBrush("recall"), { type: "CHECK", cardKey: "s1:0" });
    expect(sessionOf(state).score).toMatchObject({ score: 0, strokeCount: 0 });
    state = run(state, { type: "GRADE", cardKey: "s1:0", grade: "again" });
    expect(sessionOf(state).attempts[0]).toMatchObject({ grade: "again", outcome: "wrong" });
  });
});

describe("Pincel: Estudar ordem", () => {
  it("não desenha; avança e volta; cada kana conta uma vez", () => {
    let state = startBrush("study");
    expect(draw(state, TOP)).toBe(state);
    expect(run(state, { type: "PREV", cardKey: "s1:0" })).toBe(state);
    expect(run(state, { type: "CHECK", cardKey: "s1:0" })).toBe(state);

    state = run(state, { type: "NEXT", cardKey: "s1:0" }, { type: "PREV", cardKey: "s1:1" }, { type: "NEXT", cardKey: "s1:0" }, { type: "NEXT", cardKey: "s1:1" });
    expect(sessionOf(state).index).toBe(2);
    expect(sessionOf(state).attempts.map((attempt) => attempt.card.key)).toEqual(["s1:0", "s1:1"]);
    expect(sessionOf(state).attempts.every((attempt) => attempt.outcome === null)).toBe(true);

    state = run(state, { type: "NEXT", cardKey: "s1:2" });
    expect(state.game.screen).toBe("summary");
    expect(summarizeBrushSession(sessionOf(state))).toEqual({ practiced: 0, correct: 0, averageScore: null });
  });
});

describe("Pincel: telas e configurações", () => {
  it("encerrar sem nada feito volta ao lobby; com algo feito vai ao resumo", () => {
    expect(run(startBrush("trace"), { type: "FINISH" }).game.screen).toBe("lobby");

    let state = draw(startBrush("trace"), TOP, BOTTOM);
    state = run(state, { type: "NEXT", cardKey: keyOf(state) }, { type: "FINISH" });
    expect(state.game.screen).toBe("summary");
    expect(summarizeBrushSession(sessionOf(state))).toEqual({ practiced: 1, correct: 1, averageScore: 100 });
    expect(run(state, { type: "CLOSE" }).game.screen).toBe("lobby");
    expect(run(startBrush("trace"), { type: "CLOSE" }).game.screen).toBe("session");
  });

  it("não começa sem cartas nem com uma sessão aberta", () => {
    const lobby = createBrushState();
    expect(run(lobby, { type: "START", id: "x", cards: [] })).toBe(lobby);
    const session = startBrush("trace");
    expect(run(session, { type: "START", id: "y", cards: testCards(1, "y") })).toBe(session);
  });

  it("trocar o alfabeto limpa os grupos; nada muda durante a sessão", () => {
    const state = run(createBrushState(), { type: "TOGGLE_GROUP", groupId: "hiragana:ka-row" });
    expect(state.settings.selectedGroupIds).toEqual(["hiragana:ka-row"]);
    expect(run(state, { type: "UPDATE_SETTINGS", patch: { alphabet: "katakana" } }).settings.selectedGroupIds).toEqual([]);
    expect(run(state, { type: "UPDATE_SETTINGS", patch: { sessionSize: 20 } }).settings.selectedGroupIds).toEqual(["hiragana:ka-row"]);

    const session = startBrush("trace");
    expect(run(session, { type: "UPDATE_SETTINGS", patch: { mode: "study" } })).toBe(session);
    expect(run(session, { type: "TOGGLE_GROUP", groupId: "hiragana:ka-row" })).toBe(session);
  });
});

describe("Pincel: fila da sessão", () => {
  const glyphs = new Map(HIRAGANA.slice(0, 10).map((item) => [item.char, syntheticGlyph(item.char)]));

  it("Estudar ordem segue o baralho; os outros sorteiam sem repetir", () => {
    const study = buildBrushCards({ sessionId: "a", mode: "study", items: HIRAGANA, glyphs, size: 5, weights: new Map(), rng: createRng(1) });
    expect(study.map((card) => card.item.char).join("")).toBe("あいうえお");
    expect(study.map((card) => card.key)).toEqual(["a:0", "a:1", "a:2", "a:3", "a:4"]);

    const trace = buildBrushCards({ sessionId: "b", mode: "trace", items: HIRAGANA, glyphs, size: 5, weights: new Map(), rng: createRng(7) });
    expect(new Set(trace.map((card) => card.item.id)).size).toBe(5);
  });

  it("só entra quem tem traços; o peso do domínio puxa o kana mais fraco", () => {
    const all = buildBrushCards({ sessionId: "c", mode: "trace", items: HIRAGANA, glyphs, size: 20, weights: new Map(), rng: createRng(3) });
    expect(all).toHaveLength(10);

    let first = 0;
    for (let seed = 1; seed <= 100; seed += 1) {
      const [card] = buildBrushCards({ sessionId: "d", mode: "recall", items: HIRAGANA, glyphs, size: 1, weights: new Map([["hiragana:こ", 5]]), rng: createRng(seed) });
      if (card.item.char === "こ") first += 1;
    }
    expect(first).toBeGreaterThan(20);
  });
});
