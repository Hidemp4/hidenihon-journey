import { describe, expect, it } from "vitest";
import { distance, normalizePathData, parsePathData, polylineLength, resample, samplePath, serializePath } from "./strokePath";

describe("caminhos dos traços", () => {
  it("relativo vira absoluto; números grudados ('1.5.5', '3-4') são separados", () => {
    expect(parsePathData("M10,10c1.5.5,3-4,5,6")).toEqual([
      { type: "M", to: { x: 10, y: 10 } },
      { type: "C", c1: { x: 11.5, y: 10.5 }, c2: { x: 13, y: 6 }, to: { x: 15, y: 16 } },
    ]);
  });

  it("repetição implícita de comando e pares extras depois do M viram linhas", () => {
    const segments = parsePathData("M0,0 10,0 10,10 l5,5 5,5");
    expect(segments?.map((segment) => [segment.type, segment.to])).toEqual([
      ["M", { x: 0, y: 0 }],
      ["L", { x: 10, y: 0 }],
      ["L", { x: 10, y: 10 }],
      ["L", { x: 15, y: 15 }],
      ["L", { x: 20, y: 20 }],
    ]);
  });

  it("S reflete o controle anterior; Q/T viram cúbicas; H/V e Z viram linhas", () => {
    const s = parsePathData("M0,0C0,10,10,10,10,0S20,-10,20,0");
    expect(s?.[2]).toEqual({ type: "C", c1: { x: 10, y: -10 }, c2: { x: 20, y: -10 }, to: { x: 20, y: 0 } });

    const q = parsePathData("M0,0Q3,3,6,0T12,0");
    expect(q?.[1]).toEqual({ type: "C", c1: { x: 2, y: 2 }, c2: { x: 4, y: 2 }, to: { x: 6, y: 0 } });
    expect(q?.[2].type).toBe("C");
    if (q?.[2].type === "C") expect(q[2].c1.y).toBeCloseTo(-2);

    expect(parsePathData("M1,1H5V7h-1v-1Z")?.map((segment) => segment.to)).toEqual([
      { x: 1, y: 1 },
      { x: 5, y: 1 },
      { x: 5, y: 7 },
      { x: 4, y: 7 },
      { x: 4, y: 6 },
      { x: 1, y: 1 },
    ]);
  });

  it("malformado ou com arco devolve null", () => {
    for (const d of ["", "10,10", "M10", "M0,0C1,2,3", "M0,0A5,5,0,0,1,10,10", "L5,5", "M0,0Z5"]) expect(parsePathData(d)).toBeNull();
  });

  it("normaliza para M/L/C absolutos com 1 casa, sem mudar o desenho", () => {
    const original = "M31.01,33c0.88,0.88,2.75,1.82,5.25,1.75c8.62-0.25,20-2.12,29.5-4.25";
    const normalized = normalizePathData(original);
    expect(normalized).toBe("M31,33C31.9,33.9,33.8,34.8,36.3,34.8C44.9,34.5,56.3,32.6,65.8,30.5");

    const before = samplePath(parsePathData(original) ?? [], 0.5);
    const after = samplePath(parsePathData(normalized ?? "") ?? [], 0.5);
    const last = (points: typeof before) => points[points.length - 1];
    expect(distance(last(before), last(after))).toBeLessThan(0.1);
    expect(Math.abs(polylineLength(before) - polylineLength(after))).toBeLessThan(0.3);
    expect(serializePath([{ type: "M", to: { x: -0.04, y: 2 } }])).toBe("M0,2");
  });

  it("amostragem respeita o passo máximo e começa/termina nos extremos", () => {
    const points = samplePath(parsePathData("M0,0C30,0,30,30,60,30L60,60") ?? [], 0.5);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[points.length - 1]).toEqual({ x: 60, y: 60 });
    for (let index = 1; index < points.length; index += 1) expect(distance(points[index - 1], points[index])).toBeLessThanOrEqual(0.5 + 1e-9);
  });

  it("reamostra com espaçamento igual pelo comprimento", () => {
    const line = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(resample(line, 11).map((point) => Math.round(point.x * 1000) / 1000)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(resample([{ x: 3, y: 4 }], 3)).toEqual([
      { x: 3, y: 4 },
      { x: 3, y: 4 },
      { x: 3, y: 4 },
    ]);
    expect(resample([], 5)).toEqual([]);
    expect(polylineLength(line)).toBe(10);
  });
});
