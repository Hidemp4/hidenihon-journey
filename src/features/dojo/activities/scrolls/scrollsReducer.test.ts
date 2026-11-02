import { describe, expect, it } from "vitest";
import { SAO_PAULO } from "@/features/dojo/shared/test/zones";
import { createScrollsState } from "./scrollsReducer";
import { summarizeScrollSession } from "./summary";
import { DAY, NOON, current, flipAndGrade, run, startSession } from "./testUtils";

describe("Pergaminhos: sessão", () => {
  it("não aceita nota antes de virar a carta", () => {
    const state = startSession(2);
    const card = current(state);

    expect(run(state, { type: "GRADE", cardKey: card.key, grade: "good", now: NOON })).toBe(state);
  });

  it("vira uma vez só e ignora a nota de uma carta que já saiu da mesa", () => {
    let state = startSession(2);
    const first = current(state);
    state = run(state, { type: "FLIP", cardKey: first.key, now: NOON });
    expect(run(state, { type: "FLIP", cardKey: first.key, now: NOON + 5 })).toBe(state);

    state = run(state, { type: "GRADE", cardKey: first.key, grade: "good", now: NOON + 10 });
    expect(run(state, { type: "GRADE", cardKey: first.key, grade: "easy", now: NOON + 20 })).toBe(state);
  });

  it("na revisão, cada nota agenda a partir da meia-noite local: Errei hoje, Acertei amanhã, Fácil em 3 dias", () => {
    let state = startSession(3);
    state = flipAndGrade(state, "good");
    state = flipAndGrade(state, "again");
    state = flipAndGrade(state, "easy");

    if (state.game.screen !== "summary") throw new Error("deveria terminar");
    const [good, again, easy] = state.game.session.history;
    expect(good).toMatchObject({ toBox: 2, dueAt: Date.UTC(2026, 10, 1, 3) });
    expect(again).toMatchObject({ toBox: 1, dueAt: Date.UTC(2026, 9, 31, 3) });
    expect(easy).toMatchObject({ toBox: 3, dueAt: Date.UTC(2026, 10, 3, 3) });
  });

  it("Errei não repete a carta nesta sessão: ela fica para a próxima", () => {
    let state = startSession(2);
    state = flipAndGrade(state, "again"); // あ
    expect(current(state).item.char).toBe("い");

    state = flipAndGrade(state, "good"); // い
    if (state.game.screen !== "summary") throw new Error("a errada não volta ao fim da fila");
    expect(state.game.session.history.map((entry) => entry.card.item.char)).toEqual(["あ", "い"]);
    // Vencida já hoje: entra na próxima sessão de revisão.
    expect(state.game.session.history[0].dueAt).toBeLessThanOrEqual(NOON);
  });

  it("Z desfaz a última nota: a carta volta virada e dá para trocar a nota", () => {
    let state = startSession(2);
    state = flipAndGrade(state, "again");
    state = run(state, { type: "UNDO" });

    if (state.game.screen !== "session") throw new Error("deveria seguir em sessão");
    expect(state.game.session.flipped).toBe(true);
    expect(state.game.session.history).toHaveLength(0);
    expect(state.game.session.queue.map((card) => card.key)).toEqual(["hiragana:あ", "hiragana:い"]);

    state = run(state, { type: "GRADE", cardKey: "hiragana:あ", grade: "easy", now: NOON + 50 });
    if (state.game.screen !== "session") throw new Error("deveria seguir em sessão");
    expect(state.game.session.history[0]).toMatchObject({ grade: "easy", toBox: 3 });
    expect(state.game.session.queue.map((card) => card.key)).toEqual(["hiragana:い"]);
  });

  it("dá para desfazer a última carta já no resumo", () => {
    let state = startSession(1);
    state = flipAndGrade(state, "easy");
    expect(state.game.screen).toBe("summary");

    state = run(state, { type: "UNDO" });
    expect(state.game.screen).toBe("session");
    expect(current(state).key).toBe("hiragana:あ");
  });

  it("treino livre não agenda nada", () => {
    let state = startSession(2, "free");
    state = flipAndGrade(state, "easy");
    state = flipAndGrade(state, "again");

    if (state.game.screen !== "summary") throw new Error("deveria terminar");
    expect(state.game.session.history.every((entry) => entry.toBox === null && entry.dueAt === null)).toBe(true);
  });

  it("encerrar sem notas volta ao lobby; com notas vai para o resumo; concluir volta ao lobby", () => {
    expect(run(startSession(2), { type: "FINISH" }).game.screen).toBe("lobby");

    const graded = run(flipAndGrade(startSession(3), "good"), { type: "FINISH" });
    expect(graded.game.screen).toBe("summary");
    expect(run(graded, { type: "CLOSE" }).game.screen).toBe("lobby");
  });

  it("não começa sessão vazia nem por cima de outra", () => {
    const lobby = createScrollsState();
    expect(run(lobby, { type: "START", id: "x", mode: "review", cards: [], now: NOON, offsetAt: SAO_PAULO })).toBe(lobby);

    const session = startSession(2);
    expect(run(session, { type: "START", id: "y", mode: "free", cards: [current(session)], now: NOON, offsetAt: SAO_PAULO })).toBe(session);
  });

  it("configurações só mudam no lobby; trocar de alfabeto limpa os grupos", () => {
    let state = run(createScrollsState(), { type: "TOGGLE_GROUP", groupId: "hiragana:ka-row" });
    expect(state.settings.selectedGroupIds).toEqual(["hiragana:ka-row"]);

    state = run(state, { type: "UPDATE_SETTINGS", patch: { alphabet: "katakana" } });
    expect(state.settings).toMatchObject({ alphabet: "katakana", selectedGroupIds: [] });

    const session = startSession(1);
    expect(run(session, { type: "UPDATE_SETTINGS", patch: { newPerDay: 20 } })).toBe(session);
  });
});

describe("Pergaminhos: resumo", () => {
  it("conta as notas e agrupa quando cada carta volta", () => {
    let state = startSession(4);
    state = flipAndGrade(state, "good"); // あ: amanhã
    state = flipAndGrade(state, "again"); // い: próxima sessão
    state = flipAndGrade(state, "easy"); // う: em 3 dias
    state = flipAndGrade(state, "good"); // え: amanhã
    if (state.game.screen !== "summary") throw new Error("deveria terminar");

    const summary = summarizeScrollSession(state.game.session, NOON + 2_000, SAO_PAULO);
    expect(summary.grades).toEqual({ again: 1, good: 2, easy: 1 });
    expect(summary.reviewed).toBe(4);
    expect(summary.upcoming).toEqual([
      { days: 0, count: 1 },
      { days: 1, count: 2 },
      { days: 3, count: 1 },
    ]);
  });

  it("vencimento que já passou conta como próxima sessão (nunca negativo); treino livre não agenda", () => {
    const state = flipAndGrade(startSession(1), "again");
    if (state.game.screen !== "summary") throw new Error("deveria terminar");
    expect(summarizeScrollSession(state.game.session, NOON + DAY, SAO_PAULO).upcoming).toEqual([{ days: 0, count: 1 }]);

    const free = flipAndGrade(startSession(1, "free"), "easy");
    if (free.game.screen !== "summary") throw new Error("deveria terminar");
    expect(summarizeScrollSession(free.game.session, NOON, SAO_PAULO)).toMatchObject({ grades: { again: 0, good: 0, easy: 1 }, upcoming: [] });
  });
});
