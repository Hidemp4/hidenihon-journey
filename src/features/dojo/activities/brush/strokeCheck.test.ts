import { describe, expect, it } from "vitest";
import { createRng } from "@/features/dojo/shared/components/arena/rng";
import { DIRECTION_MIN_LENGTH } from "./constants";
import raw from "./data/kanaStrokes.json";
import kanjiRaw from "./data/kanjiStrokes.json";
import { checkStroke, strokeDistance } from "./strokeCheck";
import { buildGlyphModel, sanitizeStrokeSet } from "./strokeData";
import type { Point } from "./strokePath";

// "ニ" sintético: dois traços horizontais, de cima para baixo, da esquerda para a direita.
const glyph = buildGlyphModel("ニ", ["M20,35L89,35", "M10,80L99,80"], []);
if (!glyph) throw new Error("glifo de teste inválido");
const model = glyph.strokes;

function line(x0: number, y0: number, x1: number, y1: number, steps = 20): Point[] {
  return Array.from({ length: steps + 1 }, (_, index) => ({ x: x0 + ((x1 - x0) * index) / steps, y: y0 + ((y1 - y0) * index) / steps }));
}

describe("conferência traço a traço (sintéticos)", () => {
  it("traço certo, mesmo tremido e um pouco fora, passa", () => {
    const rng = createRng(4);
    const shaky = line(22, 38, 87, 33).map((point) => ({ x: point.x + (rng() - 0.5) * 4, y: point.y + (rng() - 0.5) * 4 }));
    expect(checkStroke(shaky, model, 0)).toEqual({ kind: "ok" });
  });

  it("direção invertida é apontada", () => {
    expect(checkStroke(line(89, 35, 20, 35), model, 0)).toEqual({ kind: "reversed" });
  });

  it("outro traço do kana é ordem errada (e diz qual)", () => {
    expect(checkStroke(line(10, 80, 99, 80), model, 0)).toEqual({ kind: "wrong-order", matched: 1 });
    // Refazer o 1º quando o esperado é o 2º também é apontado.
    expect(checkStroke(line(20, 35, 89, 35), model, 1)).toEqual({ kind: "wrong-order", matched: 0 });
  });

  it("forma que não lembra nenhum traço", () => {
    expect(checkStroke(line(50, 0, 50, 109), model, 0)).toEqual({ kind: "shape" });
  });

  it("toque (menos de 3 unidades) não conta", () => {
    expect(checkStroke([{ x: 50, y: 35 }], model, 0)).toEqual({ kind: "too-short" });
    expect(checkStroke(line(50, 35, 51, 35), model, 0)).toEqual({ kind: "too-short" });
    expect(checkStroke(line(20, 35, 89, 35), model, 5)).toEqual({ kind: "too-short" });
  });

  it("distância é simétrica e zero para o mesmo traço", () => {
    expect(strokeDistance(model[0].points, model[0].points)).toBe(0);
    expect(strokeDistance(model[0].points, model[1].points)).toBeCloseTo(strokeDistance(model[1].points, model[0].points));
    expect(strokeDistance([], model[0].points)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe.each([
  ["kana", raw],
  ["kanji", kanjiRaw],
] as const)("conferência com os traços reais do KanjiVG (%s)", (_, data) => {
  const set = sanitizeStrokeSet(data);
  if (!set) throw new Error("dados inválidos");

  it("cada traço, desenhado igual ao modelo e na ordem, passa", () => {
    for (const real of set.glyphs.values()) {
      real.strokes.forEach((stroke, index) => expect(checkStroke(stroke.points, real.strokes, index).kind, `${real.char} traço ${index + 1}`).toBe("ok"));
    }
  });

  it("cada traço com direção (não os pontinhos) desenhado ao contrário é apontado", () => {
    for (const real of set.glyphs.values()) {
      real.strokes.forEach((stroke, index) => {
        if (stroke.length < DIRECTION_MIN_LENGTH) return;
        expect(checkStroke([...stroke.points].reverse(), real.strokes, index).kind, `${real.char} traço ${index + 1}`).toBe("reversed");
      });
    }
  });

  it("desenhar o traço seguinte no lugar do esperado é ordem errada, mesmo com traços paralelos próximos", () => {
    for (const real of set.glyphs.values()) {
      for (let index = 0; index + 1 < real.strokes.length; index += 1) {
        expect(checkStroke(real.strokes[index + 1].points, real.strokes, index), `${real.char} traço ${index + 1}`).toEqual({
          kind: "wrong-order",
          matched: index + 1,
        });
      }
    }
  });

  it("traço certo com tremida e um pouco fora do guia ainda passa", () => {
    const rng = createRng(11);
    let accepted = 0;
    let total = 0;
    for (const real of set.glyphs.values()) {
      real.strokes.forEach((stroke, index) => {
        total += 1;
        const shaky = stroke.points.filter((_, step) => step % 3 === 0).map((point) => ({ x: point.x + 3 + (rng() - 0.5) * 6, y: point.y + 3 + (rng() - 0.5) * 6 }));
        if (checkStroke(shaky, real.strokes, index).kind === "ok") accepted += 1;
      });
    }
    expect(accepted / total).toBeGreaterThan(0.99);
  });
});
