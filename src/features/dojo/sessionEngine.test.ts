import { describe, expect, it } from "vitest";
import { getKanaDeck } from "./kanaDeck";
import {
  ADVANCED_RESPONSE_LIMIT_MS,
  buildMissWeights,
  createAttempt,
  createPrompt,
  createTimeoutAttempt,
  markFirstKey,
  markShown,
  pickNextKana,
  shouldFinishSession,
  DEFAULT_DOJO_SETTINGS,
} from "./sessionEngine";
import { createStampFactory } from "./testUtils";

const deck = getKanaDeck("hiragana");

describe("advanced reaction timeout", () => {
  it("registra o limite de cinco segundos como tentativa de timeout", () => {
    const nextStamp = createStampFactory();
    const kana = deck[0];
    const prompt = markShown(createPrompt(kana, "p1"), 1_000);

    const attempt = createTimeoutAttempt(prompt, nextStamp());

    expect(ADVANCED_RESPONSE_LIMIT_MS).toBe(5_000);
    expect(attempt.outcome).toBe("timeout");
    expect(attempt.answer).toBe("");
    expect(attempt.reactionMs).toBeNull();
    expect(attempt.completionMs).toBe(5_000);
    expect(attempt.kana).toBe(kana.char);
  });
});

describe("createAttempt", () => {
  it("normaliza a resposta e marca como correta", () => {
    const nextStamp = createStampFactory();
    const kana = deck[0];
    const prompt = markFirstKey(markShown(createPrompt(kana, "p1"), 1_000), 1_250);

    const attempt = createAttempt(prompt, `  ${kana.romaji.toUpperCase()} `, nextStamp({ now: 1_600 }));

    expect(attempt.outcome).toBe("correct");
    expect(attempt.answer).toBe(kana.romaji.toLowerCase());
    expect(attempt.reactionMs).toBe(250);
    expect(attempt.completionMs).toBe(600);
  });

  it("marca como errada e mantém reactionMs nulo quando nada foi digitado antes", () => {
    const nextStamp = createStampFactory();
    const prompt = markShown(createPrompt(deck[0], "p1"), 1_000);

    const attempt = createAttempt(prompt, "zzz", nextStamp({ now: 1_300 }));

    expect(attempt.outcome).toBe("wrong");
    expect(attempt.reactionMs).toBeNull();
  });

  it("não quebra se o prompt ainda não foi pintado (shownAt nulo)", () => {
    const nextStamp = createStampFactory();
    const attempt = createAttempt(createPrompt(deck[0], "p1"), deck[0].romaji, nextStamp({ now: 500 }));

    expect(attempt.completionMs).toBe(0);
  });
});

describe("pickNextKana", () => {
  it("retorna null para deck vazio e o único kana para deck unitário", () => {
    expect(pickNextKana([])).toBeNull();
    expect(pickNextKana([deck[0]], [deck[0].char])).toBe(deck[0]);
  });

  it("nunca repete o kana anterior, mesmo em decks pequenos", () => {
    const small = deck.slice(0, 3);

    for (let step = 0; step < 50; step += 1) {
      const random = step / 50;
      const next = pickNextKana(small, [small[1].char], random);
      expect(next?.char).not.toBe(small[1].char);
    }
  });

  it("evita os kana recentes em decks grandes", () => {
    const recent = deck.slice(0, 3).map((kana) => kana.char);

    for (let step = 0; step < 50; step += 1) {
      const next = pickNextKana(deck, recent, step / 50);
      expect(recent).not.toContain(next?.char);
    }
  });

  it("dá mais chance aos kana com peso maior", () => {
    const pair = deck.slice(0, 2);
    const weights = new Map([[pair[1].char, 9]]);

    // peso total = 1 + 9 = 10 → rolls de 0.1 em diante caem no segundo kana
    expect(pickNextKana(pair, [], 0.05, weights)).toBe(pair[0]);
    expect(pickNextKana(pair, [], 0.5, weights)).toBe(pair[1]);
  });
});

describe("buildMissWeights", () => {
  it("sobe o peso nos erros e desce nos acertos seguintes", () => {
    const nextStamp = createStampFactory();
    const prompt = markShown(createPrompt(deck[0], "p1"), 0);
    const wrong = createAttempt(prompt, "zzz", nextStamp());
    const right = createAttempt(prompt, deck[0].romaji, nextStamp());

    expect(buildMissWeights([wrong]).get(deck[0].char)).toBe(3);
    expect(buildMissWeights([wrong, right]).get(deck[0].char)).toBe(2);
    expect(buildMissWeights([right]).get(deck[0].char)).toBe(1);
  });
});

describe("shouldFinishSession", () => {
  it("só encerra automaticamente no modo quantidade", () => {
    const quantity = { ...DEFAULT_DOJO_SETTINGS, mode: "quantity" as const, targetCount: 10 };

    expect(shouldFinishSession(quantity, 9)).toBe(false);
    expect(shouldFinishSession(quantity, 10)).toBe(true);
    expect(shouldFinishSession({ ...quantity, mode: "free" }, 999)).toBe(false);
    expect(shouldFinishSession({ ...quantity, mode: "timed" }, 999)).toBe(false);
  });
});
