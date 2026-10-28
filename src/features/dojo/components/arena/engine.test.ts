import { describe, expect, it } from "vitest";
import { ArenaEngine, LANES } from "./engine";
import { RELEASE_TIME, type Action, type Element, type Ninja } from "./ninjas";
import { createRng } from "./rng";

function simulate(engine: ArenaEngine, seconds: number, onFrame?: () => void) {
  for (let t = 0; t < seconds; t += 1 / 60) {
    engine.update(1 / 60);
    onFrame?.();
  }
}

function createEngine(width: number, height: number, seed = 1) {
  const engine = new ArenaEngine({ rng: createRng(seed) });
  engine.resize(width, height);
  return engine;
}

/** Deixa só os ninjas indicados "ativos" e parados, para testar um jutsu isolado. */
function isolate(engine: ArenaEngine) {
  engine.ninjas.forEach((ninja) => {
    ninja.action = "idle";
    ninja.dur = 999;
    ninja.cooldown = 999;
    ninja.z = 0;
  });
}

function castNow(ninja: Ninja) {
  ninja.action = "cast";
  ninja.t = RELEASE_TIME - 0.001;
  ninja.dur = 0.8;
  ninja.released = false;
}

describe("ArenaEngine: layout", () => {
  it("usa mais ninjas em telas largas e no mínimo 3", () => {
    expect(createEngine(195, 220).ninjas).toHaveLength(3);
    expect(createEngine(360, 120).ninjas).toHaveLength(4);
  });

  it("reposiciona dentro dos limites e limpa efeitos ao redimensionar", () => {
    const engine = createEngine(360, 120);
    engine.ninjas[0].x = 340;
    castNow(engine.ninjas[0]);
    simulate(engine, 0.1);

    engine.resize(120, 120);

    expect(engine.ninjas.every((ninja) => ninja.x <= 120 - 14 && ninja.x >= 14)).toBe(true);
    expect(engine.effects).toEqual([]);
  });

  it("os pés ficam sempre dentro da faixa de chão", () => {
    const engine = createEngine(360, 120);
    engine.ninjas.forEach((ninja) => {
      expect(ninja.lane).toBeGreaterThanOrEqual(0);
      expect(ninja.lane).toBeLessThan(LANES);
      const feet = engine.feetY(ninja);
      expect(feet).toBeGreaterThan(engine.groundY);
      expect(feet).toBeLessThan(engine.height);
    });
  });
});

describe("ArenaEngine: comportamento aleatório", () => {
  it("nunca sai da tela e a vida fica sempre entre o mínimo e 1", () => {
    for (const width of [195, 360, 640]) {
      const engine = createEngine(width, 120, width);

      simulate(engine, 90, () => {
        for (const ninja of engine.ninjas) {
          expect(ninja.x).toBeGreaterThanOrEqual(14);
          expect(ninja.x).toBeLessThanOrEqual(width - 14);
          expect(ninja.z).toBeGreaterThanOrEqual(0);
          expect(ninja.hp).toBeGreaterThanOrEqual(0.12);
          expect(ninja.hp).toBeLessThanOrEqual(1);
          expect(Number.isFinite(ninja.x)).toBe(true);
        }
      });
    }
  });

  it("todos os comportamentos acontecem (correr, pular, lançar jutsu e levar dano)", () => {
    const engine = createEngine(360, 120, 11);
    const seen = new Set<Action>();

    simulate(engine, 240, () => engine.ninjas.forEach((ninja) => seen.add(ninja.action)));

    expect([...seen].sort()).toEqual(["cast", "hurt", "idle", "jump", "run"]);
  });

  it("cada ninja realmente se movimenta ao longo do tempo", () => {
    const engine = createEngine(360, 120, 4);
    const start = engine.ninjas.map((ninja) => ninja.x);
    const travelled = engine.ninjas.map(() => 0);
    let previous = [...start];

    simulate(engine, 60, () => {
      engine.ninjas.forEach((ninja, index) => {
        travelled[index] += Math.abs(ninja.x - previous[index]);
        previous[index] = ninja.x;
      });
    });

    travelled.forEach((distance) => expect(distance).toBeGreaterThan(40));
  });

  it("é determinístico com a mesma semente", () => {
    const a = createEngine(360, 120, 99);
    const b = createEngine(360, 120, 99);
    simulate(a, 20);
    simulate(b, 20);

    expect(a.ninjas.map((n) => [n.x, n.action])).toEqual(b.ninjas.map((n) => [n.x, n.action]));
  });

  it("limita o passo de tempo (aba em segundo plano não teletransporta ninguém)", () => {
    const engine = createEngine(360, 120);
    engine.update(10);

    expect(engine.time).toBeLessThanOrEqual(0.05);
  });

  it("não acumula efeitos indefinidamente", () => {
    const engine = createEngine(360, 120, 21);
    let max = 0;
    simulate(engine, 180, () => {
      max = Math.max(max, engine.effects.length);
    });

    expect(max).toBeLessThan(25);
  });
});

describe("ArenaEngine: jutsus", () => {
  const cases: Array<[Element, string]> = [
    ["fire", "fire"],
    ["aqua", "slash"],
    ["earth", "wall"],
    ["lightning", "bolt"],
  ];

  it.each(cases)("%s gera o efeito %s ao soltar o golpe", (element, kind) => {
    const engine = createEngine(360, 120);
    isolate(engine);
    const caster = engine.ninjas.find((ninja) => ninja.def.element === element)!;
    caster.x = 100;
    caster.dir = 1;

    castNow(caster);
    engine.update(0.01);

    expect(engine.effects.some((effect) => effect.kind === kind)).toBe(true);
  });

  it("bola de fogo acerta o oponente na frente, tira vida e some", () => {
    const engine = createEngine(360, 120);
    isolate(engine);
    const caster = engine.ninjas.find((ninja) => ninja.def.element === "fire")!;
    const victim = engine.ninjas.find((ninja) => ninja !== caster)!;
    engine.ninjas.filter((ninja) => ninja !== caster && ninja !== victim).forEach((ninja) => (ninja.x = 340));
    caster.x = 60;
    caster.dir = 1;
    caster.lane = 2;
    victim.x = 140;
    victim.lane = 2;

    castNow(caster);
    simulate(engine, 1.5);

    expect(victim.hp).toBeLessThan(1);
    expect(engine.effects.some((effect) => effect.kind === "fire")).toBe(false);
  });

  it("relâmpago acerta o alvo à frente depois de um instante", () => {
    const engine = createEngine(360, 120);
    isolate(engine);
    const caster = engine.ninjas.find((ninja) => ninja.def.element === "lightning")!;
    const victim = engine.ninjas.find((ninja) => ninja !== caster)!;
    engine.ninjas.filter((ninja) => ninja !== caster && ninja !== victim).forEach((ninja) => (ninja.x = 340));
    caster.x = 100;
    caster.dir = 1;
    victim.x = 160;

    castNow(caster);
    simulate(engine, 0.3);

    expect(victim.action === "hurt" || victim.hp < 1).toBe(true);
  });

  it("projétil não machuca quem o lançou", () => {
    const engine = createEngine(360, 120);
    isolate(engine);
    const caster = engine.ninjas.find((ninja) => ninja.def.element === "aqua")!;
    engine.ninjas.filter((ninja) => ninja !== caster).forEach((ninja) => (ninja.x = 340));
    caster.x = 100;
    caster.dir = -1; // atira para o lado vazio

    castNow(caster);
    simulate(engine, 1);

    expect(caster.hp).toBe(1);
  });
});

describe("ArenaEngine: render", () => {
  it("avisa com clareza quando falta o createCanvas", () => {
    const engine = createEngine(360, 120);
    const fakeContext = {} as CanvasRenderingContext2D;

    expect(() => engine.render(fakeContext)).toThrow(/createCanvas/);
  });
});
