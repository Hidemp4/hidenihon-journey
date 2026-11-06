import { describe, expect, it } from "vitest";
import { allDivisions, leagueIndexFor, levelFor, metaFor, standingFor, totalXpForLevel, xpToAdvance } from "./ladder";
import { LEAGUES } from "./rules";

describe("ligas", () => {
  it("8 ligas, na ordem pedida; todas com 3 divisões menos a última", () => {
    expect(LEAGUES.map((league) => league.name)).toEqual(["Bronze", "Prata", "Ouro", "Platina", "Diamante", "Imortal", "Titã", "Lendário"]);
    expect(LEAGUES.slice(0, -1).every((league) => league.divisions.length === 3)).toBe(true);
    expect(LEAGUES[LEAGUES.length - 1].divisions).toHaveLength(1);
  });

  it("a escada sobe sempre: pisos e metas crescentes, Bronze começa no 0", () => {
    const floors = allDivisions().map((step) => step.floor);
    expect(floors[0]).toBe(0);
    floors.slice(1).forEach((floor, i) => expect(floor).toBeGreaterThan(floors[i]));
    LEAGUES.slice(1).forEach((league, i) => expect(league.meta).toBeGreaterThan(LEAGUES[i].meta));
  });

  it("divisão pelos troféus (III é a mais baixa), com o caminho para a próxima", () => {
    expect(standingFor(0)).toMatchObject({ label: "Bronze III", floor: 0, nextFloor: 100, nextLabel: "Bronze II", progress: 0 });
    expect(standingFor(99).label).toBe("Bronze III");
    expect(standingFor(100).label).toBe("Bronze II");
    expect(standingFor(299).label).toBe("Bronze I");
    expect(standingFor(300).label).toBe("Prata III");
    expect(standingFor(1050)).toMatchObject({ label: "Ouro II", floor: 950, nextFloor: 1150, progress: 0.5 });
    expect(standingFor(4999).label).toBe("Titã I");
    expect(standingFor(5000)).toMatchObject({ label: "Lendário", division: null, nextFloor: null, nextLabel: null, progress: 1 });
    expect(standingFor(9000).label).toBe("Lendário");
  });

  it("troféus inválidos (negativo, NaN) contam como 0", () => {
    expect(standingFor(-50).label).toBe("Bronze III");
    expect(leagueIndexFor(Number.NaN)).toBe(0);
    expect(metaFor(-1)).toBe(40);
  });
});

describe("meta", () => {
  it("é a da liga no piso e sobe em linha reta até o piso da próxima", () => {
    expect(metaFor(0)).toBe(40);
    expect(metaFor(150)).toBe(48); // metade do caminho Bronze (40) → Prata (55): 47,5
    expect(metaFor(300)).toBe(55);
    expect(metaFor(525)).toBe(60);
    expect(metaFor(950)).toBe(68); // o exemplo do REGRAS.md
    expect(metaFor(3900)).toBe(91);
    expect(metaFor(4999)).toBe(95);
  });

  it("no Lendário: +1 a cada 250 troféus, até 99", () => {
    expect(metaFor(5000)).toBe(95);
    expect(metaFor(5249)).toBe(95);
    expect(metaFor(5250)).toBe(96);
    expect(metaFor(6000)).toBe(99);
    expect(metaFor(50_000)).toBe(99);
  });
});

describe("nível", () => {
  it("do nível n para o n+1: 100 + 25 × (n − 1)", () => {
    expect(xpToAdvance(1)).toBe(100);
    expect(xpToAdvance(2)).toBe(125);
    expect(xpToAdvance(10)).toBe(325);
  });

  it("a tabela do REGRAS.md", () => {
    expect([2, 5, 10, 20, 50, 100].map(totalXpForLevel)).toEqual([100, 550, 1800, 6175, 34300, 131175]);
  });

  it("começa no 1 e sobe exatamente no limiar", () => {
    expect(levelFor(0)).toEqual({ level: 1, intoLevel: 0, forNext: 100, progress: 0 });
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100)).toMatchObject({ level: 2, intoLevel: 0, forNext: 125 });
    expect(levelFor(224).level).toBe(2);
    expect(levelFor(225).level).toBe(3);
    expect(levelFor(131175).level).toBe(100);
    expect(levelFor(131174).level).toBe(99);
  });

  it("bate com a soma passo a passo em qualquer XP (a fórmula fechada não erra o arredondamento)", () => {
    let level = 1;
    let next = xpToAdvance(1);
    let floor = 0;
    for (let xp = 0; xp <= 60_000; xp += 37) {
      while (xp >= floor + next) {
        floor += next;
        level += 1;
        next = xpToAdvance(level);
      }
      expect(levelFor(xp).level).toBe(level);
    }
    expect(levelFor(-10).level).toBe(1);
    expect(levelFor(Number.NaN).level).toBe(1);
  });
});
