import { describe, expect, it } from "vitest";
import { STROKE_COUNT_PENALTY } from "./constants";
import { countOn, createBitmap, dilate, fitToModel, rasterizePolylines, scoreBitmaps, scoreDrawing, suggestGrade, type Bitmap } from "./scoring";
import { buildGlyphModel } from "./strokeData";

const SIZE = 16;

/** Bitmap sintético a partir de um desenho em texto ("#" = ligado). */
function bitmap(rows: string[]): Bitmap {
  const result = createBitmap(rows.length);
  rows.forEach((row, y) => [...row].forEach((cell, x) => (result.data[y * rows.length + x] = cell === "#" ? 1 : 0)));
  return result;
}

function bar({ x0, y0, x1, y1 }: { x0: number; y0: number; x1: number; y1: number }): Bitmap {
  const result = createBitmap(SIZE);
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) result.data[y * SIZE + x] = 1;
  return result;
}

describe("bitmap", () => {
  it("rasteriza linhas grossas no quadro de 64", () => {
    const line = rasterizePolylines([[{ x: 0, y: 54.5 }, { x: 109, y: 54.5 }]], { radius: 1 });
    expect(line.size).toBe(64);
    // Uma faixa horizontal de ~2px de altura atravessando o quadro.
    expect(countOn(line)).toBeGreaterThanOrEqual(64 * 2);
    expect(countOn(line)).toBeLessThanOrEqual(64 * 3);
    expect(line.data[32 * 64 + 10]).toBe(1);
    expect(line.data[10 * 64 + 10]).toBe(0);

    // Um toque vira um disco (raio 1,5 no centro do quadro: o bloco 2×2 do meio).
    expect(countOn(rasterizePolylines([[{ x: 54.5, y: 54.5 }]], { radius: 1.5 }))).toBe(4);
    expect(countOn(rasterizePolylines([]))).toBe(0);
  });

  it("dilata com disco e respeita as bordas", () => {
    const dot = bitmap([".....", ".....", "..#..", ".....", "....."]);
    expect(dilate(dot, 1).data).toEqual(bitmap([".....", "..#..", ".###.", "..#..", "....."]).data);
    expect(countOn(dilate(bitmap(["#..", "...", "..."]), 1))).toBe(3);
  });
});

describe("nota pelo bitmap (sintéticos)", () => {
  const model = bar({ x0: 2, y0: 7, x1: 13, y1: 8 }); // barra horizontal

  it("desenho igual ao modelo: 100%", () => {
    expect(scoreBitmaps(model, model)).toEqual({ recall: 1, precision: 1, value: 1 });
  });

  it("sem desenho (ou sem modelo): 0", () => {
    expect(scoreBitmaps(model, createBitmap(SIZE)).value).toBe(0);
    expect(scoreBitmaps(createBitmap(SIZE), model).value).toBe(0);
  });

  it("deslocado dentro da tolerância ainda conta inteiro", () => {
    const shifted = bar({ x0: 2, y0: 9, x1: 13, y1: 10 });
    expect(scoreBitmaps(model, shifted)).toMatchObject({ recall: 1, precision: 1 });
  });

  it("só metade do modelo: precisão alta, cobertura baixa", () => {
    const half = bar({ x0: 2, y0: 7, x1: 4, y1: 8 });
    const result = scoreBitmaps(model, half);
    expect(result.precision).toBe(1);
    expect(result.recall).toBeLessThan(0.75);
    expect(result.value).toBeLessThan(0.85);
  });

  it("rabisco cobrindo tudo: cobertura total, precisão baixa", () => {
    const everything = bar({ x0: 0, y0: 0, x1: 15, y1: 15 });
    const result = scoreBitmaps(model, everything);
    expect(result.recall).toBe(1);
    expect(result.precision).toBeLessThan(0.6);
    expect(result.value).toBeLessThan(0.75);
  });

  it("traço no lugar errado (vertical num canto): perto de 0", () => {
    const wrong = bar({ x0: 0, y0: 0, x1: 0, y1: 3 });
    expect(scoreBitmaps(model, wrong).value).toBe(0);
  });
});

describe("nota do desenho contra o glifo", () => {
  const glyph = buildGlyphModel("二", ["M20,35L89,35", "M10,80L99,80"], []);
  if (!glyph) throw new Error("glifo de teste inválido");
  const exact = glyph.strokes.map((stroke) => stroke.points);

  it("o próprio modelo tira 100; traço a menos desconta", () => {
    expect(scoreDrawing(glyph, exact, { fit: false })).toMatchObject({ score: 100, strokeCount: 2, expectedStrokes: 2 });
    const one = scoreDrawing(glyph, [exact[1]], { fit: false });
    expect(one.strokeCount).toBe(1);
    expect(one.score).toBeLessThan(100 - STROKE_COUNT_PENALTY);
  });

  it("traços a mais também descontam (no máximo 30)", () => {
    const repeated = [...exact, ...exact, ...exact, ...exact, ...exact];
    expect(scoreDrawing(glyph, repeated, { fit: false }).score).toBe(70);
  });

  it("de memória: desenho certo, pequeno e num canto, é encaixado antes da nota", () => {
    const small = exact.map((stroke) => stroke.map((point) => ({ x: point.x / 2, y: point.y / 2 })));
    expect(scoreDrawing(glyph, small, { fit: false }).score).toBeLessThan(40);
    expect(scoreDrawing(glyph, small, { fit: true }).score).toBe(100);
  });

  it("o encaixe não estica mais que 2× (um traço solto não vira o kana todo)", () => {
    const tiny = [[{ x: 50, y: 50 }, { x: 52, y: 50 }]];
    const [fitted] = fitToModel(tiny, exact);
    expect(fitted[1].x - fitted[0].x).toBeCloseTo(4);
    expect(fitToModel([], exact)).toEqual([]);
  });

  it("sugestão da autoavaliação", () => {
    expect(suggestGrade({ score: 90, recall: 1, precision: 1, strokeCount: 2, expectedStrokes: 2 })).toBe("good");
    expect(suggestGrade({ score: 90, recall: 1, precision: 1, strokeCount: 3, expectedStrokes: 2 })).toBe("almost");
    expect(suggestGrade({ score: 60, recall: 1, precision: 1, strokeCount: 2, expectedStrokes: 2 })).toBe("almost");
    expect(suggestGrade({ score: 20, recall: 1, precision: 1, strokeCount: 2, expectedStrokes: 2 })).toBe("again");
  });
});
