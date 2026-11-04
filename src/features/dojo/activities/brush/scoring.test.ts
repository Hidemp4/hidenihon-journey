import { describe, expect, it } from "vitest";
import { MAX_STROKE_COUNT_PENALTY, STROKE_COUNT_PENALTY, ZERO_SCORE_ERROR } from "./constants";
import raw from "./data/kanaStrokes.json";
import { fitToModel, pairedStrokeError, samplePolylines, scoreDrawing, scoreFromError, suggestGrade, type DrawingScore } from "./scoring";
import { buildGlyphModel, sanitizeStrokeSet } from "./strokeData";
import type { Point } from "./strokePath";

const glyph = buildGlyphModel("二", ["M20,35L89,35", "M10,80L99,80"], []);
if (!glyph) throw new Error("glifo de teste inválido");
const exact = glyph.strokes.map((stroke) => stroke.points);

function moved(strokes: ReadonlyArray<readonly Point[]>, dx: number, dy: number): Point[][] {
  return strokes.map((stroke) => stroke.map((point) => ({ x: point.x + dx, y: point.y + dy })));
}

function score(partial: Partial<DrawingScore>): DrawingScore {
  return { score: 0, error: 0, coverage: 0, precision: 0, strokeError: 0, strokeCount: 2, expectedStrokes: 2, ...partial };
}

describe("nota sem folga: erro → 0–100", () => {
  it("100 só com erro zero; qualquer erro tira pelo menos 1 ponto (arredonda para baixo)", () => {
    expect(scoreFromError(0)).toBe(100);
    expect(scoreFromError(0.001)).toBe(99);
    expect(scoreFromError(ZERO_SCORE_ERROR / 2)).toBe(50);
    expect(scoreFromError(ZERO_SCORE_ERROR)).toBe(0);
    expect(scoreFromError(ZERO_SCORE_ERROR * 3)).toBe(0);
    expect(scoreFromError(Number.NaN)).toBe(0);
    expect(scoreFromError(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("amostra os traços pelo comprimento (a cada unidade); pontinho vira um ponto", () => {
    expect(samplePolylines([[{ x: 0, y: 0 }, { x: 10, y: 0 }]])).toHaveLength(11);
    expect(samplePolylines([[{ x: 5, y: 5 }]])).toEqual([{ x: 5, y: 5 }]);
  });

  it("traço contra traço pega a direção: o mesmo traço ao contrário tem erro grande", () => {
    const stroke = exact[0];
    expect(pairedStrokeError(stroke, stroke)).toBe(0);
    expect(pairedStrokeError([...stroke].reverse(), stroke)).toBeGreaterThan(30);
  });
});

describe("nota do desenho contra o glifo", () => {
  it("o próprio modelo tira 100, com erro zero (no Traçar e encaixado)", () => {
    expect(scoreDrawing(glyph, exact, { fit: false })).toMatchObject({ score: 100, error: 0, strokeCount: 2, expectedStrokes: 2 });
    expect(scoreDrawing(glyph, exact, { fit: true })).toMatchObject({ score: 100, error: 0 });
  });

  it("um décimo de unidade fora já não é 100", () => {
    const result = scoreDrawing(glyph, moved(exact, 0, 0.1), { fit: false });
    expect(result.score).toBeLessThan(100);
    expect(result.score).toBeGreaterThanOrEqual(98);
  });

  it("deslocado 1 unidade: erro 1 em todas as medidas, nota 100 × (1 − 1/ZERO)", () => {
    const result = scoreDrawing(glyph, moved(exact, 0, 1), { fit: false });
    expect(result.coverage).toBeCloseTo(1, 5);
    expect(result.precision).toBeCloseTo(1, 5);
    expect(result.strokeError).toBeCloseTo(1, 5);
    expect(result.score).toBe(Math.floor(100 * (1 - 1 / ZERO_SCORE_ERROR)));
  });

  it("quanto mais longe, menor a nota (sem patamar de tolerância)", () => {
    const scores = [0, 0.5, 1, 2, 3, 5, 8].map((offset) => scoreDrawing(glyph, moved(exact, 0, offset), { fit: false }).score);
    for (let index = 1; index < scores.length; index += 1) expect(scores[index]).toBeLessThan(scores[index - 1]);
    expect(scores[scores.length - 1]).toBe(0);
  });

  it("faltou metade de um traço: a cobertura acusa; tinta fora do lugar: a precisão acusa", () => {
    const half = [exact[0], exact[1].slice(0, Math.ceil(exact[1].length / 2))];
    const partial = scoreDrawing(glyph, half, { fit: false });
    expect(partial.coverage).toBeGreaterThan(10);
    expect(partial.score).toBeLessThan(40);

    const scribble = [exact[0], [...exact[1], { x: 99, y: 10 }, { x: 10, y: 10 }]];
    const messy = scoreDrawing(glyph, scribble, { fit: false });
    expect(messy.precision).toBeGreaterThan(10);
    expect(messy.score).toBeLessThan(40);
  });

  it("forma idêntica com a ordem trocada ou um traço ao contrário perde muito (a ordem faz parte do pedido)", () => {
    const swapped = scoreDrawing(glyph, [exact[1], exact[0]], { fit: false });
    expect(swapped).toMatchObject({ coverage: 0, precision: 0 });
    expect(swapped.score).toBeLessThan(40);

    const reversed = scoreDrawing(glyph, [[...exact[0]].reverse(), exact[1]], { fit: false });
    expect(reversed.score).toBeLessThan(60);
  });

  it(`traço a mais ou a menos desconta ${STROKE_COUNT_PENALTY} cada (no máximo ${MAX_STROKE_COUNT_PENALTY})`, () => {
    const once = scoreDrawing(glyph, [...exact, exact[0]], { fit: false });
    expect(once).toMatchObject({ coverage: 0, precision: 0, strokeError: null, score: 100 - STROKE_COUNT_PENALTY });
    const repeated = [...exact, ...exact, ...exact, ...exact, ...exact];
    expect(scoreDrawing(glyph, repeated, { fit: false }).score).toBe(100 - MAX_STROKE_COUNT_PENALTY);
    expect(scoreDrawing(glyph, [exact[1]], { fit: false }).score).toBeLessThan(100 - STROKE_COUNT_PENALTY);
  });

  it("sem desenho: 0", () => {
    expect(scoreDrawing(glyph, [], { fit: true })).toMatchObject({ score: 0, strokeCount: 0, strokeError: null });
  });

  it("de memória: desenho certo, pequeno e num canto, é encaixado antes da nota (tamanho e posição não contam)", () => {
    const small = exact.map((stroke) => stroke.map((point) => ({ x: point.x / 2, y: point.y / 2 })));
    expect(scoreDrawing(glyph, small, { fit: false }).score).toBe(0);
    expect(scoreDrawing(glyph, small, { fit: true }).score).toBe(100);
    // Mas a forma conta: achatado na largura não é o mesmo kana.
    const squashed = exact.map((stroke) => stroke.map((point) => ({ x: 54.5 + (point.x - 54.5) * 0.8, y: point.y })));
    expect(scoreDrawing(glyph, squashed, { fit: true }).score).toBeLessThan(90);
  });

  it("o encaixe não estica mais que 2× (um traço solto não vira o kana todo)", () => {
    const tiny = [[{ x: 50, y: 50 }, { x: 52, y: 50 }]];
    const [fitted] = fitToModel(tiny, exact);
    expect(fitted[1].x - fitted[0].x).toBeCloseTo(4);
    expect(fitToModel([], exact)).toEqual([]);
  });

  it("sugestão da autoavaliação", () => {
    expect(suggestGrade(score({ score: 90 }))).toBe("good");
    expect(suggestGrade(score({ score: 90, strokeCount: 3 }))).toBe("almost");
    expect(suggestGrade(score({ score: 60 }))).toBe("almost");
    expect(suggestGrade(score({ score: 20 }))).toBe("again");
  });
});

describe("nota nos traços reais do KanjiVG (todos os kana)", () => {
  const set = sanitizeStrokeSet(raw);
  if (!set) throw new Error("dados de traço inválidos");
  const glyphs = [...set.glyphs.values()];

  it("só o próprio modelo tira 100; meia unidade de deslocamento já fica abaixo de 100 em todos", () => {
    for (const model of glyphs) {
      const strokes = model.strokes.map((stroke) => stroke.points);
      expect(scoreDrawing(model, strokes, { fit: false }).score, model.char).toBe(100);
      const off = scoreDrawing(model, moved(strokes, 0.5, 0), { fit: false }).score;
      expect(off, model.char).toBeLessThan(100);
      expect(off, model.char).toBeGreaterThan(85);
    }
  });

  it("deslocar 3 unidades (≈3% do quadro) já derruba para perto de 2/3 da nota", () => {
    const scores = glyphs.map((model) => scoreDrawing(model, moved(model.strokes.map((stroke) => stroke.points), 3, 0), { fit: false }).score);
    expect(Math.max(...scores)).toBeLessThan(80);
    expect(scores.reduce((sum, value) => sum + value, 0) / scores.length).toBeLessThan(70);
  });
});
