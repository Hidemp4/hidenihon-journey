import { getKanaStudyItems } from "@/features/dojo/shared/studyItem";
import { createExamState, examReducer, type ExamAction, type ExamState } from "./examReducer";
import type { ExamSettings } from "./types";

export const HIRAGANA = getKanaStudyItems("hiragana");

export function run(state: ExamState, ...actions: ExamAction[]) {
  return actions.reduce(examReducer, state);
}

export function startExam(settings: Partial<ExamSettings> = {}, items = HIRAGANA, seed = 1) {
  const state = run(createExamState(), { type: "UPDATE_SETTINGS", patch: settings });
  return run(state, { type: "START", id: "exame-1", items, weights: new Map(), seed, now: 0 });
}

export function currentQuestion(state: ExamState) {
  if (state.game.screen !== "question") throw new Error(`esperava pergunta, veio ${state.game.screen}`);
  return state.game.run.question;
}

/** Responde certo ou errado e avança. */
export function answer(state: ExamState, correct: boolean, at = 1_000) {
  const question = currentQuestion(state);
  const wrongIndex = question.options.findIndex((_, index) => index !== question.correctIndex);
  const answered = run(state, { type: "ANSWER", questionId: question.id, optionIndex: correct ? question.correctIndex : wrongIndex, now: at });
  return run(answered, { type: "NEXT", questionId: question.id, seed: at, now: at + 10 });
}
