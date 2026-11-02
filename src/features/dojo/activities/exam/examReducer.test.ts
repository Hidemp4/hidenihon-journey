import { describe, expect, it } from "vitest";
import { SURVIVAL_HARD_FROM, SURVIVAL_LIVES } from "./constants";
import { confusablesOf } from "./confusables";
import { createExamState, missedItems } from "./examReducer";
import { summarizeExamRun } from "./results";
import { HIRAGANA, answer, currentQuestion, run, startExam } from "./testUtils";

describe("Exame: rodada", () => {
  it("faz N perguntas e termina no resultado", () => {
    let state = startExam({ mode: "round", questionCount: 10 });
    for (let index = 0; index < 10; index += 1) state = answer(state, index % 2 === 0);

    if (state.game.screen !== "result") throw new Error("deveria terminar");
    expect(state.game.run.answers).toHaveLength(10);
    expect(summarizeExamRun(state.game.run)).toMatchObject({ total: 10, correct: 5, score: 50 });
  });

  it("mostra o feedback antes de avançar e ignora resposta repetida/atrasada", () => {
    const state = startExam();
    const question = currentQuestion(state);
    const answered = run(state, { type: "ANSWER", questionId: question.id, optionIndex: question.correctIndex, now: 500 });

    expect(answered.game.screen).toBe("feedback");
    expect(run(answered, { type: "ANSWER", questionId: question.id, optionIndex: 0, now: 600 })).toBe(answered);
    expect(run(answered, { type: "NEXT", questionId: "outra", seed: 1, now: 700 })).toBe(answered);
    expect(run(state, { type: "ANSWER", questionId: question.id, optionIndex: 9, now: 600 })).toBe(state);
  });

  it("mede o tempo da resposta desde que a pergunta apareceu", () => {
    const state = startExam();
    const question = currentQuestion(state);
    const answered = run(state, { type: "ANSWER", questionId: question.id, optionIndex: question.correctIndex, now: 1_234 });
    if (answered.game.screen !== "feedback") throw new Error("deveria ter feedback");
    expect(answered.game.run.answers[0]).toMatchObject({ outcome: "correct", ms: 1_234 });
  });

  it("é determinístico pela semente da ação", () => {
    expect(currentQuestion(startExam({}, HIRAGANA, 42))).toEqual(currentQuestion(startExam({}, HIRAGANA, 42)));
  });

  it("encerrar sem responder volta ao lobby; com respostas vai ao resultado", () => {
    expect(run(startExam(), { type: "FINISH" }).game.screen).toBe("lobby");
    expect(run(answer(startExam(), true), { type: "FINISH" }).game.screen).toBe("result");
  });
});

describe("Exame: Sobrevivência", () => {
  it(`começa com ${SURVIVAL_LIVES} vidas e acaba quando elas acabam`, () => {
    let state = startExam({ mode: "survival" });
    if (state.game.screen !== "question") throw new Error("deveria começar");
    expect(state.game.run.lives).toBe(SURVIVAL_LIVES);

    state = answer(state, true);
    state = answer(state, false);
    state = answer(state, false);
    expect(state.game.screen).toBe("question");
    state = answer(state, false);
    if (state.game.screen !== "result") throw new Error("deveria terminar sem vidas");
    expect(state.game.run.lives).toBe(0);
    expect(state.game.run.answers).toHaveLength(4);
  });

  it(`a partir da ${SURVIVAL_HARD_FROM}ª pergunta os distratores são todos confundíveis quando possível`, () => {
    let state = startExam({ mode: "survival" }, HIRAGANA, 3);
    for (let index = 0; index < SURVIVAL_HARD_FROM - 1; index += 1) state = answer(state, true);

    // Da 10ª em diante: para cada kana com confundíveis suficientes, todos os distratores saem deles.
    for (let index = 0; index < 30; index += 1) {
      const question = currentQuestion(state);
      const confusable = confusablesOf(question.item.char);
      const available = HIRAGANA.filter((item) => confusable.has(item.char)).length;
      const distractorChars = question.options
        .filter((_, optionIndex) => optionIndex !== question.correctIndex)
        .map((option) => HIRAGANA.find((item) => item.id === option.itemId)?.char ?? "");
      expect(distractorChars.filter((char) => confusable.has(char))).toHaveLength(Math.min(3, available));
      state = answer(state, true);
    }
  });
});

describe("Exame: Relâmpago", () => {
  it("tempo esgotado conta como erro; fora do Relâmpago o TIMEOUT é ignorado", () => {
    const lightning = startExam({ mode: "lightning", timeLimitSeconds: 3 });
    if (lightning.game.screen !== "question") throw new Error("deveria começar");
    expect(lightning.game.run.timeLimitMs).toBe(3_000);

    const question = currentQuestion(lightning);
    const timedOut = run(lightning, { type: "TIMEOUT", questionId: question.id, now: 3_000 });
    if (timedOut.game.screen !== "feedback") throw new Error("deveria ter feedback");
    expect(timedOut.game.run.answers[0]).toMatchObject({ outcome: "timeout", chosenIndex: null });

    // Respondeu no último frame: o timeout que chega depois é ignorado.
    const answered = run(lightning, { type: "ANSWER", questionId: question.id, optionIndex: question.correctIndex, now: 2_990 });
    expect(run(answered, { type: "TIMEOUT", questionId: question.id, now: 3_000 })).toBe(answered);

    const round = startExam({ mode: "round" });
    expect(run(round, { type: "TIMEOUT", questionId: currentQuestion(round).id, now: 9_000 })).toBe(round);
  });
});

describe("Exame: revisar só os erros", () => {
  it("monta uma rodada só com os kana errados, uma vez cada, sem tempo nem vidas", () => {
    let state = startExam({ mode: "lightning", questionCount: 10 }, HIRAGANA, 11);
    const missed: string[] = [];
    for (let index = 0; index < 10; index += 1) {
      const correct = index % 3 !== 0;
      if (!correct) missed.push(currentQuestion(state).item.id);
      state = answer(state, correct);
    }
    if (state.game.screen !== "result") throw new Error("deveria terminar");
    expect(missedItems(state.game.run.answers).map((item) => item.id)).toEqual([...new Set(missed)]);

    state = run(state, { type: "REVIEW_MISSES", id: "revisao-1", seed: 5, now: 0 });
    if (state.game.screen !== "question") throw new Error("deveria começar a revisão");
    expect(state.game.run).toMatchObject({ review: true, mode: "round", timeLimitMs: null, lives: null, questionCount: new Set(missed).size });

    const asked: string[] = [];
    while (state.game.screen === "question") {
      asked.push(currentQuestion(state).item.id);
      state = answer(state, true);
    }
    expect(asked.sort()).toEqual([...new Set(missed)].sort());
    expect(state.game.screen).toBe("result");
  });

  it("sem erros não há revisão", () => {
    let state = startExam({ questionCount: 10 });
    for (let index = 0; index < 10; index += 1) state = answer(state, true);
    expect(run(state, { type: "REVIEW_MISSES", id: "r", seed: 1, now: 0 })).toBe(state);
  });
});

describe("Exame: configurações", () => {
  it("só mudam no lobby; trocar de alfabeto limpa os grupos; baralho vazio não começa", () => {
    let state = run(createExamState(), { type: "TOGGLE_GROUP", groupId: "hiragana:ka-row" }, { type: "UPDATE_SETTINGS", patch: { alphabet: "katakana" } });
    expect(state.settings).toMatchObject({ alphabet: "katakana", selectedGroupIds: [] });

    state = run(state, { type: "START", id: "x", items: [], weights: new Map(), seed: 1, now: 0 });
    expect(state.game.screen).toBe("lobby");

    const started = startExam();
    expect(run(started, { type: "UPDATE_SETTINGS", patch: { mode: "survival" } })).toBe(started);
  });
});

describe("Exame: resultado", () => {
  it("nota, tempo médio só dos acertos e lista de erros com a correta", () => {
    let state = startExam({ questionCount: 10 }, HIRAGANA, 2);
    const first = currentQuestion(state);
    state = run(state, { type: "ANSWER", questionId: first.id, optionIndex: (first.correctIndex + 1) % first.options.length, now: 300 });
    state = run(state, { type: "NEXT", questionId: first.id, seed: 9, now: 400 });
    const second = currentQuestion(state);
    state = run(state, { type: "ANSWER", questionId: second.id, optionIndex: second.correctIndex, now: 1_400 });
    state = run(state, { type: "FINISH" });
    if (state.game.screen !== "result") throw new Error("deveria ir ao resultado");

    const result = summarizeExamRun(state.game.run);
    expect(result).toMatchObject({ total: 2, correct: 1, score: 50, averageMs: 1_000 });
    expect(result.misses).toEqual([
      {
        questionId: first.id,
        prompt: first.item.char,
        chosen: first.options[(first.correctIndex + 1) % first.options.length].label,
        correct: first.item.romaji,
        char: first.item.char,
        answer: first.item.romaji,
        outcome: "wrong",
      },
    ]);
  });
});
