import { describe, expect, it } from "vitest";
import { createRng, pickWeighted, range } from "./rng";

describe("createRng", () => {
  it("é determinístico para a mesma semente e diferente para outra", () => {
    const a = createRng(42);
    const b = createRng(42);
    const c = createRng(43);
    const seqA = Array.from({ length: 5 }, a);

    expect(Array.from({ length: 5 }, b)).toEqual(seqA);
    expect(Array.from({ length: 5 }, c)).not.toEqual(seqA);
    expect(seqA.every((value) => value >= 0 && value < 1)).toBe(true);
  });
});

describe("range / pickWeighted", () => {
  it("range respeita os limites", () => {
    const rng = createRng(1);
    for (let i = 0; i < 100; i += 1) {
      const value = range(rng, 5, 10);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThan(10);
    }
  });

  it("nunca escolhe opção com peso zero e devolve null se tudo for zero", () => {
    const rng = createRng(9);
    for (let i = 0; i < 200; i += 1) {
      expect(
        pickWeighted(rng, [
          ["a", 0],
          ["b", 1],
          ["c", 0],
        ])
      ).toBe("b");
    }

    expect(pickWeighted(rng, [["a", 0]])).toBeNull();
  });

  it("respeita as proporções aproximadas", () => {
    const rng = createRng(5);
    let heavy = 0;
    for (let i = 0; i < 2000; i += 1) {
      if (
        pickWeighted(rng, [
          ["light", 1],
          ["heavy", 9],
        ]) === "heavy"
      )
        heavy += 1;
    }

    expect(heavy / 2000).toBeGreaterThan(0.85);
    expect(heavy / 2000).toBeLessThan(0.95);
  });
});
