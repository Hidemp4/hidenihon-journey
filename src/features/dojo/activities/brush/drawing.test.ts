import { describe, expect, it } from "vitest";
import { STROKE_ANIMATION } from "./constants";
import { appendPoint, clientToModel, smoothStrokeCommands, strokeTimeline, timelineEnd } from "./drawing";

describe("canvas: coordenadas e suavização", () => {
  it("converte o ponteiro para o quadro de 109, preso às bordas", () => {
    const rect = { left: 100, top: 50, width: 218, height: 218 };
    expect(clientToModel(209, 159, rect, 109)).toEqual({ x: 54.5, y: 54.5 });
    expect(clientToModel(0, 1_000, rect, 109)).toEqual({ x: 0, y: 109 });
    // Sem tamanho ainda (layout não aconteceu): não dá para desenhar.
    expect(clientToModel(10, 10, { left: 0, top: 0, width: 0, height: 0 }, 109)).toBeNull();
  });

  it("descarta pontos colados no anterior (tremida)", () => {
    const points = [{ x: 0, y: 0 }];
    expect(appendPoint(points, { x: 0.2, y: 0.2 }, 0.6)).toBe(false);
    expect(appendPoint(points, { x: 1, y: 0 }, 0.6)).toBe(true);
    expect(points).toHaveLength(2);
  });

  it("suaviza com quadráticas pelos pontos médios e termina no último ponto", () => {
    expect(smoothStrokeCommands([])).toEqual([]);
    expect(smoothStrokeCommands([{ x: 1, y: 1 }])).toEqual([{ type: "dot", at: { x: 1, y: 1 } }]);
    expect(
      smoothStrokeCommands([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 10 },
      ])
    ).toEqual([
      { type: "move", to: { x: 0, y: 0 } },
      { type: "quad", control: { x: 10, y: 0 }, to: { x: 10, y: 5 } },
      { type: "quad", control: { x: 10, y: 10 }, to: { x: 15, y: 10 } },
      { type: "line", to: { x: 20, y: 10 } },
    ]);
  });
});

describe("animação da ordem", () => {
  it("um traço depois do outro, com duração pelo comprimento (mínimo para traços curtos)", () => {
    const timeline = strokeTimeline([90, 9, 45]);
    expect(timeline).toEqual([
      { delayMs: 0, durationMs: 1_000 },
      { delayMs: 1_000 + STROKE_ANIMATION.gapMs, durationMs: STROKE_ANIMATION.minMs },
      { delayMs: 1_000 + STROKE_ANIMATION.minMs + 2 * STROKE_ANIMATION.gapMs, durationMs: 500 },
    ]);
    expect(timelineEnd(timeline)).toBe(1_000 + STROKE_ANIMATION.minMs + 2 * STROKE_ANIMATION.gapMs + 500);
    expect(timelineEnd([])).toBe(0);
  });
});
