import { describe, expect, it } from "vitest";
import { createRng } from "@/features/dojo/shared/components/arena/rng";
import { buildFreeQueue, buildReviewQueue, countReviewAvailability } from "./queue";
import { DAY, HIRAGANA, NOON, record } from "./testUtils";

const [a, i, u, e, o, ka, ki] = HIRAGANA;

describe("fila da revisão", () => {
  const records = {
    [u.id]: record({ box: 3, dueAt: NOON - 3 * DAY }),
    [a.id]: record({ box: 2, dueAt: NOON - DAY }),
    [i.id]: record({ box: 1, dueAt: NOON - DAY }),
    [e.id]: record({ box: 4, dueAt: NOON + DAY }), // ainda não venceu
    // `o` foi visto na Arena (seen > 0), mas nunca entrou na agenda: para os Pergaminhos é novo.
    [o.id]: record({ seen: 5, correct: 5, dueAt: null }),
  };

  it("vencidos primeiro, do mais atrasado; empate fica com a caixa menor", () => {
    const queue = buildReviewQueue({ items: HIRAGANA, records, now: NOON, newPerDay: 0, introducedToday: 0 });

    expect(queue.map((card) => card.item.char)).toEqual(["う", "い", "あ"]);
    expect(queue.every((card) => !card.isNew)).toBe(true);
    // Cada carta aparece uma vez: a chave é o próprio id.
    expect(queue.map((card) => card.key)).toEqual([u.id, i.id, a.id]);
  });

  it("depois dos vencidos vêm os novos, na ordem do baralho, até o limite do dia", () => {
    const queue = buildReviewQueue({ items: HIRAGANA, records, now: NOON, newPerDay: 3, introducedToday: 0 });

    expect(queue.slice(3).map((card) => card.item.char)).toEqual(["お", "か", "き"]);
    expect(queue.slice(3).every((card) => card.isNew)).toBe(true);
    expect(queue.map((card) => card.item.char)).not.toContain("え");
  });

  it("o limite é por dia: novos já apresentados hoje descontam", () => {
    const context = { items: HIRAGANA, records, now: NOON, newPerDay: 5 };

    expect(buildReviewQueue({ ...context, introducedToday: 3 }).filter((card) => card.isNew)).toHaveLength(2);
    expect(buildReviewQueue({ ...context, introducedToday: 5 }).filter((card) => card.isNew)).toHaveLength(0);
    expect(buildReviewQueue({ ...context, introducedToday: 9 }).filter((card) => card.isNew)).toHaveLength(0);
  });

  it("só olha as cartas do baralho escolhido (grupos)", () => {
    const queue = buildReviewQueue({ items: [a, ka, ki], records, now: NOON, newPerDay: 10, introducedToday: 0 });
    expect(queue.map((card) => card.item.char)).toEqual(["あ", "か", "き"]);
  });

  it("conta o que há para hoje e o próximo vencimento futuro", () => {
    expect(countReviewAvailability({ items: HIRAGANA, records, now: NOON, newPerDay: 2, introducedToday: 0 })).toEqual({
      due: 3,
      fresh: 2,
      unseen: HIRAGANA.length - 4,
      nextDueAt: NOON + DAY,
    });
    expect(countReviewAvailability({ items: [e], records, now: NOON, newPerDay: 10, introducedToday: 0 })).toEqual({
      due: 0,
      fresh: 0,
      unseen: 0,
      nextDueAt: NOON + DAY,
    });
  });
});

describe("fila do treino livre", () => {
  it("ignora a agenda, não repete carta e respeita o tamanho", () => {
    const records = { [a.id]: record({ box: 5, dueAt: NOON + 10 * DAY }) };
    const queue = buildFreeQueue({ items: HIRAGANA, records, weights: new Map(), rng: createRng(7), size: 20 });

    expect(queue).toHaveLength(20);
    expect(new Set(queue.map((card) => card.item.id)).size).toBe(20);
  });

  it("é determinística com a mesma semente e puxa primeiro quem tem mais peso", () => {
    const context = { items: HIRAGANA, records: {}, size: 5 };
    const weights = new Map([[ki.id, 1_000]]);

    expect(buildFreeQueue({ ...context, weights, rng: createRng(3) }).map((card) => card.item.id)).toEqual(
      buildFreeQueue({ ...context, weights, rng: createRng(3) }).map((card) => card.item.id)
    );
    expect(buildFreeQueue({ ...context, weights, rng: createRng(3) })[0].item.id).toBe(ki.id);
  });

  it("baralho menor que o tamanho devolve o baralho todo", () => {
    expect(buildFreeQueue({ items: [a, i], records: {}, weights: new Map(), rng: createRng(1) })).toHaveLength(2);
  });
});
