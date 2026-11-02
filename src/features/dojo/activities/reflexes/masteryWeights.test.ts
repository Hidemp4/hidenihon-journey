import { describe, expect, it } from "vitest";
import { createRng } from "@/features/dojo/shared/components/arena/rng";
import { getKanaDeck } from "@/features/dojo/shared/kanaDeck";
import { createInitialState, dojoReducer, type DojoAction, type DojoState } from "./dojoReducer";
import { combineWeights, masteryWeightsForDeck, pickNextKana } from "./sessionEngine";
import { createStampFactory } from "./testUtils";

const HIRAGANA = getKanaDeck("hiragana");

function run(state: DojoState, ...actions: DojoAction[]) {
  return actions.reduce(dojoReducer, state);
}

function countdown() {
  return run(createInitialState(), { type: "ENTER_LOBBY" }, { type: "BEGIN_COUNTDOWN" });
}

describe("Reflexos ponderado pelo domínio (Fase 6)", () => {
  it("converte os pesos do domínio (por id) para os da Arena (por kana), só do baralho", () => {
    const mastery = new Map([
      ["hiragana:あ", 4],
      ["katakana:ア", 5],
      ["kanji:日", 5],
    ]);
    expect(masteryWeightsForDeck(HIRAGANA, mastery)).toEqual(new Map([["あ", 4]]));
    expect(masteryWeightsForDeck(getKanaDeck("mixed"), mastery)).toEqual(
      new Map([
        ["あ", 4],
        ["ア", 5],
      ])
    );
  });

  it("combina: parte do domínio e soma os erros da sessão, entre 1 e 5", () => {
    const mastery = new Map([
      ["あ", 3],
      ["い", 5],
    ]);
    const session = new Map([
      ["あ", 3],
      ["い", 3],
      ["う", 1],
      ["え", 5],
    ]);
    expect(combineWeights(mastery, session)).toEqual(
      new Map([
        ["あ", 5],
        ["い", 5],
        ["う", 1],
        ["え", 5],
      ])
    );
    // Sem domínio, fica igual aos pesos só da sessão (o comportamento de antes).
    expect(combineWeights(new Map(), session)).toEqual(session);
  });

  it("o 1º kana da sessão já sai pelo peso do domínio", () => {
    // random perto de 1 cai no fim da roleta; com o peso no あ (o 1º), a roleta inteira é dele quase toda.
    const weights = new Map(HIRAGANA.map((kana) => [kana.char, kana.char === "あ" ? 5 : 1] as const));
    const stamp = createStampFactory()({ random: 0.05 });
    const withoutMastery = run(countdown(), { type: "START_TRAINING", stamp });
    const withMastery = run(countdown(), { type: "START_TRAINING", stamp, masteryWeights: weights });
    if (withoutMastery.game.screen !== "training" || withMastery.game.screen !== "training") throw new Error("deveria treinar");

    expect(withMastery.game.masteryWeights).toBe(weights);
    expect(withoutMastery.game.masteryWeights.size).toBe(0);
    // Mesmo sorteio (random 0.05): sem domínio cai no 3º kana; com o あ pesando 5×, cai nele.
    expect(withoutMastery.game.prompt.kana.char).toBe(pickNextKana(HIRAGANA, [], 0.05)?.char);
    expect(withMastery.game.prompt.kana.char).toBe("あ");
  });

  it("os próximos kana também usam o domínio somado aos erros da sessão", () => {
    /** Uma sessão inteira com a mesma sequência de sorteios; conta quantas vezes o お aparece. */
    function timesShown(masteryWeights?: ReadonlyMap<string, number>) {
      const rng = createRng(21);
      const nextStamp = createStampFactory();
      let state = run(countdown(), { type: "START_TRAINING", stamp: nextStamp({ random: rng() }), masteryWeights });
      let hits = 0;
      for (let index = 0; index < 200 && state.game.screen === "training"; index += 1) {
        const { prompt } = state.game;
        if (prompt.kana.char === "お") hits += 1;
        state = run(
          state,
          { type: "PROMPT_SHOWN", promptId: prompt.id, now: 1_000 + index * 1_000 },
          { type: "ANSWER", promptId: prompt.id, value: prompt.kana.romaji, final: true, stamp: nextStamp({ random: rng() }) }
        );
      }
      return hits;
    }

    expect(timesShown(new Map([["お", 5]]))).toBeGreaterThan(timesShown());
  });
});
