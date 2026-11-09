import { describe, expect, it } from "vitest";
import { COUNTDOWN_START } from "./constants";
import { getKanaDeck } from "@/features/dojo/shared/kanaDeck";
import {
  createInitialState,
  dojoReducer,
  type DojoAction,
  type DojoState,
} from "./dojoReducer";
import { createStampFactory } from "./testUtils";

function run(state: DojoState, ...actions: DojoAction[]) {
  return actions.reduce(dojoReducer, state);
}

function startTraining(overrides: Partial<DojoState["settings"]> = {}) {
  const nextStamp = createStampFactory();
  let state = run(
    createInitialState(),
    { type: "ENTER_LOBBY" },
    { type: "UPDATE_SETTINGS", patch: overrides },
    { type: "BEGIN_COUNTDOWN" }
  );
  state = run(state, { type: "START_TRAINING", stamp: nextStamp() });
  return { state, nextStamp };
}

/** Troca o kana do prompt atual por um com romaji de 2+ letras, para testar respostas parciais. */
function withLongRomajiPrompt(state: DojoState): DojoState {
  if (state.game.screen !== "training") throw new Error("não está em treino");
  const kana = getKanaDeck("hiragana").find((item) => item.romaji.length >= 2);
  if (!kana) throw new Error("deck sem romaji de 2+ letras");
  return { ...state, game: { ...state.game, prompt: { ...state.game.prompt, kana } } };
}

function currentPrompt(state: DojoState) {
  if (state.game.screen !== "training") throw new Error("não está em treino");
  return state.game.prompt;
}

describe("fluxo de telas", () => {
  it("vai de intro → lobby → contagem → treino", () => {
    const nextStamp = createStampFactory();
    let state = createInitialState();
    expect(state.game.screen).toBe("intro");

    state = run(state, { type: "ENTER_LOBBY" });
    expect(state.game.screen).toBe("lobby");

    state = run(state, { type: "BEGIN_COUNTDOWN" });
    expect(state.game).toEqual({ screen: "countdown", count: COUNTDOWN_START });

    state = run(state, { type: "COUNTDOWN_TICK" }, { type: "COUNTDOWN_TICK" }, { type: "COUNTDOWN_TICK" });
    expect(state.game).toEqual({ screen: "countdown", count: 0 });

    state = run(state, { type: "START_TRAINING", stamp: nextStamp() });
    expect(state.game.screen).toBe("training");
  });

  it("ignora ações fora de contexto", () => {
    const initial = createInitialState();

    expect(dojoReducer(initial, { type: "BEGIN_COUNTDOWN" })).toBe(initial);
    expect(dojoReducer(initial, { type: "COUNTDOWN_TICK" })).toBe(initial);
  });
});

describe("configurações", () => {
  it("limpa os grupos ao trocar de alfabeto", () => {
    const state = run(
      createInitialState(),
      { type: "ENTER_LOBBY" },
      { type: "TOGGLE_GROUP", groupId: "hiragana:vowels" },
      { type: "UPDATE_SETTINGS", patch: { alphabet: "katakana" } }
    );

    expect(state.settings.alphabet).toBe("katakana");
    expect(state.settings.selectedGroupIds).toEqual([]);
  });

  it("alterna a seleção de grupos", () => {
    const base = run(createInitialState(), { type: "ENTER_LOBBY" });
    const on = run(base, { type: "TOGGLE_GROUP", groupId: "g1" });
    const off = run(on, { type: "TOGGLE_GROUP", groupId: "g1" });

    expect(on.settings.selectedGroupIds).toEqual(["g1"]);
    expect(off.settings.selectedGroupIds).toEqual([]);
  });
});

describe("treino", () => {
  it("só marca shownAt para o prompt atual e apenas uma vez", () => {
    const { state } = startTraining();
    const prompt = currentPrompt(state);

    const stale = dojoReducer(state, { type: "PROMPT_SHOWN", promptId: "outro", now: 10 });
    expect(stale).toBe(state);

    const shown = dojoReducer(state, { type: "PROMPT_SHOWN", promptId: prompt.id, now: 2_000 });
    expect(currentPrompt(shown).shownAt).toBe(2_000);

    const again = dojoReducer(shown, { type: "PROMPT_SHOWN", promptId: prompt.id, now: 3_000 });
    expect(again).toBe(shown);
  });

  it("não resolve enquanto digita, mas registra a primeira tecla", () => {
    const { state: initial, nextStamp } = startTraining();
    const state = withLongRomajiPrompt(initial);
    const prompt = currentPrompt(state);

    const next = dojoReducer(state, {
      type: "ANSWER",
      promptId: prompt.id,
      value: prompt.kana.romaji.slice(0, 1),
      final: false,
      stamp: nextStamp(),
    });

    if (next.game.screen !== "training") throw new Error("deveria seguir em treino");
    expect(next.game.session.attempts).toHaveLength(0);
    expect(next.game.prompt.id).toBe(prompt.id);
    expect(next.game.prompt.firstKeyAt).not.toBeNull();
  });

  it("registra acerto ao confirmar e avança para outro kana", () => {
    const { state, nextStamp } = startTraining();
    const prompt = currentPrompt(state);

    const next = dojoReducer(state, {
      type: "ANSWER",
      promptId: prompt.id,
      value: prompt.kana.romaji,
      final: true,
      stamp: nextStamp(),
    });

    if (next.game.screen !== "training") throw new Error("deveria seguir em treino");
    expect(next.game.session.attempts).toHaveLength(1);
    expect(next.game.session.attempts[0].outcome).toBe("correct");
    expect(next.game.prompt.id).not.toBe(prompt.id);
    expect(next.game.prompt.kana.char).not.toBe(prompt.kana.char);
    expect(next.effect?.type).toBe("correct");
  });

  it("digitar nunca julga: nem o errado (ainda dá para apagar) nem o certo; só a confirmação", () => {
    const { state, nextStamp } = startTraining();
    const prompt = currentPrompt(state);
    const type = (from: DojoState, value: string, final = false) =>
      dojoReducer(from, { type: "ANSWER", promptId: prompt.id, value, final, stamp: nextStamp() });

    const typo = type(state, "zzz");
    if (typo.game.screen !== "training") throw new Error("deveria seguir em treino");
    expect(typo.game.session.attempts).toHaveLength(0);
    expect(typo.game.prompt.id).toBe(prompt.id);

    const fixed = type(typo, prompt.kana.romaji);
    if (fixed.game.screen !== "training") throw new Error("deveria seguir em treino");
    expect(fixed.game.session.attempts).toHaveLength(0);

    const confirmed = type(fixed, prompt.kana.romaji, true);
    if (confirmed.game.screen !== "training") throw new Error("deveria seguir em treino");
    expect(confirmed.game.session.attempts.map((attempt) => attempt.outcome)).toEqual(["correct"]);
  });

  it("confirmar um romaji que não bate conta como erro", () => {
    const { state, nextStamp } = startTraining();
    const prompt = currentPrompt(state);

    const next = dojoReducer(state, { type: "ANSWER", promptId: prompt.id, value: "zzz", final: true, stamp: nextStamp() });

    if (next.game.screen !== "training") throw new Error("deveria seguir em treino");
    expect(next.game.session.attempts[0]).toMatchObject({ outcome: "wrong", answer: "zzz" });
  });

  it("confirmar o campo vazio (Enter sem querer) não conta nada", () => {
    const { state, nextStamp } = startTraining();
    const prompt = currentPrompt(state);

    expect(dojoReducer(state, { type: "ANSWER", promptId: prompt.id, value: "  ", final: true, stamp: nextStamp() })).toBe(state);
  });

  it("o tempo vai até a última tecla da resposta: o Enter só confirma", () => {
    const { state: initial, nextStamp } = startTraining();
    const prompt = currentPrompt(initial);
    const [first, ...rest] = prompt.kana.romaji;
    const answer = (value: string, final: boolean, now: number) => ({
      type: "ANSWER" as const,
      promptId: prompt.id,
      value,
      final,
      stamp: nextStamp({ now }),
    });

    const state = run(
      initial,
      { type: "PROMPT_SHOWN", promptId: prompt.id, now: 10_000 },
      answer(first, false, 10_300),
      answer(prompt.kana.romaji, false, 10_300 + rest.length * 120 + 1),
      answer(prompt.kana.romaji, true, 12_000)
    );

    if (state.game.screen !== "training") throw new Error("deveria seguir em treino");
    expect(state.game.session.attempts[0]).toMatchObject({ outcome: "correct", reactionMs: 300, completionMs: 301 + rest.length * 120 });
  });

  it("Enter com resposta incompleta conta como erro", () => {
    const { state: initial, nextStamp } = startTraining();
    const state = withLongRomajiPrompt(initial);
    const prompt = currentPrompt(state);

    const next = dojoReducer(state, {
      type: "ANSWER",
      promptId: prompt.id,
      value: prompt.kana.romaji.slice(0, 1),
      final: true,
      stamp: nextStamp(),
    });

    if (next.game.screen !== "training") throw new Error("deveria seguir em treino");
    expect(next.game.session.attempts[0].outcome).toBe("wrong");
  });

  it("ignora resposta de um prompt que já foi resolvido (corrida de eventos)", () => {
    const { state, nextStamp } = startTraining();
    const prompt = currentPrompt(state);
    const answered = dojoReducer(state, {
      type: "ANSWER",
      promptId: prompt.id,
      value: prompt.kana.romaji,
      final: true,
      stamp: nextStamp(),
    });

    const late = dojoReducer(answered, {
      type: "ANSWER",
      promptId: prompt.id,
      value: prompt.kana.romaji,
      final: true,
      stamp: nextStamp(),
    });

    expect(late).toBe(answered);
  });

  it("timeout só vale no Avançado e só para o prompt atual", () => {
    const easy = startTraining({ difficulty: "genin" });
    const easyPrompt = currentPrompt(easy.state);
    expect(dojoReducer(easy.state, { type: "TIMEOUT", promptId: easyPrompt.id, stamp: easy.nextStamp() })).toBe(easy.state);

    const hard = startTraining({ difficulty: "jonin" });
    const hardPrompt = currentPrompt(hard.state);
    expect(dojoReducer(hard.state, { type: "TIMEOUT", promptId: "velho", stamp: hard.nextStamp() })).toBe(hard.state);

    const timedOut = dojoReducer(hard.state, { type: "TIMEOUT", promptId: hardPrompt.id, stamp: hard.nextStamp() });
    if (timedOut.game.screen !== "training") throw new Error("deveria seguir em treino");
    expect(timedOut.game.session.attempts[0].outcome).toBe("timeout");
    expect(timedOut.effect?.type).toBe("timeout");
  });

  it("no Avançado, resposta digitada e não confirmada a tempo vira tempo esgotado (com o limite cheio)", () => {
    const { state: initial, nextStamp } = startTraining({ difficulty: "jonin" });
    const prompt = currentPrompt(initial);
    const state = run(
      initial,
      { type: "PROMPT_SHOWN", promptId: prompt.id, now: 10_000 },
      { type: "ANSWER", promptId: prompt.id, value: prompt.kana.romaji, final: false, stamp: nextStamp({ now: 10_400 }) },
      { type: "TIMEOUT", promptId: prompt.id, stamp: nextStamp({ now: 15_000 }) }
    );

    if (state.game.screen !== "training") throw new Error("deveria seguir em treino");
    expect(state.game.session.attempts[0]).toMatchObject({ outcome: "timeout", completionMs: 5_000 });
  });

  it("encerra sozinho ao atingir a quantidade e guarda o resultado", () => {
    const training = startTraining({ mode: "quantity", targetCount: 10 });
    const { nextStamp } = training;
    let { state } = training;

    for (let index = 0; index < 10; index += 1) {
      const prompt = currentPrompt(state);
      state = dojoReducer(state, {
        type: "ANSWER",
        promptId: prompt.id,
        value: prompt.kana.romaji,
        final: true,
        stamp: nextStamp(),
      });
    }

    expect(state.game.screen).toBe("lobby");
    expect(state.justFinished).toBe(true);
    expect(state.lastSession?.attempts).toHaveLength(10);
    expect(state.lastSession?.finishedAt).not.toBeNull();
  });

  it("FINISH sem tentativas descarta a sessão e preserva o último resultado", () => {
    const { state, nextStamp } = startTraining();

    const finished = dojoReducer(state, { type: "FINISH", stamp: nextStamp() });

    expect(finished.game.screen).toBe("lobby");
    expect(finished.lastSession).toBeNull();
    expect(finished.justFinished).toBe(false);
  });

  it("FINISH fora do treino não faz nada", () => {
    const state = run(createInitialState(), { type: "ENTER_LOBBY" });
    expect(dojoReducer(state, { type: "FINISH", stamp: createStampFactory()() })).toBe(state);
  });

  it("CLEAR_EFFECT só remove o efeito com o mesmo id", () => {
    const { state, nextStamp } = startTraining();
    const prompt = currentPrompt(state);
    const answered = dojoReducer(state, {
      type: "ANSWER",
      promptId: prompt.id,
      value: prompt.kana.romaji,
      final: true,
      stamp: nextStamp(),
    });

    expect(dojoReducer(answered, { type: "CLEAR_EFFECT", id: "outro" })).toBe(answered);
    expect(dojoReducer(answered, { type: "CLEAR_EFFECT", id: answered.effect!.id }).effect).toBeNull();
  });
});
