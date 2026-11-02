import { describe, expect, it } from "vitest";
import { createRng } from "./components/arena/rng";
import { pickAvoidingRecent, sampleWeighted, shuffle } from "./random";

describe("sorteios", () => {
  it("shuffle é determinístico pela semente, mantém os itens e não altera a original", () => {
    const items = [1, 2, 3, 4, 5, 6];
    const shuffled = shuffle(items, createRng(9));

    expect(shuffle(items, createRng(9))).toEqual(shuffled);
    expect([...shuffled].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("evita os recentes, mas nunca bloqueia o baralho inteiro", () => {
    const items = ["a", "b", "c", "d"];
    for (let seed = 1; seed < 30; seed += 1) {
      expect(pickAvoidingRecent(items, (item) => item, ["a", "b", "c"], createRng(seed))).toBe("d");
    }
    expect(pickAvoidingRecent(["a", "b"], (item) => item, ["a", "b"], createRng(1))).toBe("a");
    expect(pickAvoidingRecent(["só"], (item) => item, ["só"], createRng(1))).toBe("só");
    expect(pickAvoidingRecent([], (item: string) => item, [], createRng(1))).toBeNull();
  });

  it("peso maior aparece mais", () => {
    const rng = createRng(5);
    let heavy = 0;
    for (let index = 0; index < 400; index += 1) {
      if (pickAvoidingRecent(["leve", "pesado"], (item) => item, [], rng, (item) => (item === "pesado" ? 9 : 1)) === "pesado") heavy += 1;
    }
    expect(heavy).toBeGreaterThan(300);
  });

  it("sampleWeighted: sem repetir, determinístico, com peso e sem passar do que existe", () => {
    const items = ["a", "b", "c", "d", "e"];
    const sample = sampleWeighted(items, 3, createRng(2));
    expect(new Set(sample).size).toBe(3);
    expect(sampleWeighted(items, 3, createRng(2))).toEqual(sample);
    expect(sampleWeighted(items, 9, createRng(1)).sort()).toEqual(items);
    expect(items).toEqual(["a", "b", "c", "d", "e"]);

    let first = 0;
    for (let seed = 1; seed <= 100; seed += 1) if (sampleWeighted(items, 1, createRng(seed), (item) => (item === "e" ? 50 : 1))[0] === "e") first += 1;
    expect(first).toBeGreaterThan(80);
  });
});
