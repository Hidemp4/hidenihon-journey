import { createRng, type Rng } from "@/features/dojo/shared/components/arena/rng";
import { groupsKey } from "@/features/dojo/shared/content";
import { toggleGroupSelection } from "@/features/dojo/shared/kanaDeck";
import { shuffle } from "@/features/dojo/shared/random";
import type { StudyItem } from "@/features/dojo/shared/studyItem";
import { DEFAULT_EXAM_SETTINGS, SURVIVAL_HARD_FROM, SURVIVAL_LIVES } from "./constants";
import { buildQuestion, pickQuestionDirection, pickQuestionItem } from "./questions";
import type { AnswerOutcome, ExamAnswer, ExamRun, ExamSettings, QuizQuestion } from "./types";

export type ExamGame =
  | { screen: "lobby" }
  | { screen: "question"; run: ExamRun }
  /** Respondida: mostra a correta e espera Enter/clique (ou o avanço automático). */
  | { screen: "feedback"; run: ExamRun }
  | { screen: "result"; run: ExamRun };

export interface ExamState {
  settings: ExamSettings;
  game: ExamGame;
}

/**
 * O que é aleatório entra como `seed` na ação e vira um rng aqui dentro:
 * a mesma ação sempre gera a mesma pergunta (reducer puro, testável e seguro no StrictMode).
 */
export type ExamAction =
  | { type: "UPDATE_SETTINGS"; patch: Partial<ExamSettings> }
  | { type: "TOGGLE_GROUP"; groupId: string }
  | { type: "START"; id: string; items: StudyItem[]; weights: ReadonlyMap<string, number>; seed: number; now: number }
  | { type: "ANSWER"; questionId: string; optionIndex: number; now: number }
  | { type: "TIMEOUT"; questionId: string; now: number }
  | { type: "NEXT"; questionId: string; seed: number; now: number }
  | { type: "REVIEW_MISSES"; id: string; seed: number; now: number }
  | { type: "FINISH" }
  | { type: "CLOSE" };

export function createExamState(settings: ExamSettings = DEFAULT_EXAM_SETTINGS): ExamState {
  return { settings: { ...settings, selectedGroupIds: [...settings.selectedGroupIds] }, game: { screen: "lobby" } };
}

/** Itens errados (ou que estouraram o tempo), sem repetir, na ordem em que foram errados. */
export function missedItems(answers: readonly ExamAnswer[]): StudyItem[] {
  const seen = new Set<string>();
  return answers.flatMap(({ outcome, question }) => {
    if (outcome === "correct" || seen.has(question.item.id)) return [];
    seen.add(question.item.id);
    return [question.item];
  });
}

export function isRunFinished(run: ExamRun): boolean {
  if (run.lives != null) return run.lives <= 0;
  return run.questionCount != null && run.answers.length >= run.questionCount;
}

function nextQuestion(run: Pick<ExamRun, "id" | "mode" | "direction" | "deck" | "weights" | "queue" | "answers">, rng: Rng): QuizQuestion | null {
  const index = run.answers.length;
  const item = run.queue
    ? (run.queue[index] ?? null)
    : pickQuestionItem(
        run.deck,
        run.answers.map((answer) => answer.question.item.id),
        rng,
        run.weights
      );
  if (!item) return null;

  return buildQuestion({
    id: `${run.id}:${index}`,
    item,
    deck: run.deck,
    direction: pickQuestionDirection(run.direction, rng),
    rng,
    hard: run.mode === "survival" && index + 1 >= SURVIVAL_HARD_FROM,
  });
}

function resolve(run: ExamRun, chosenIndex: number | null, now: number): ExamRun {
  const outcome: AnswerOutcome =
    chosenIndex == null ? "timeout" : chosenIndex === run.question.correctIndex ? "correct" : "wrong";
  const answer: ExamAnswer = {
    question: run.question,
    chosenIndex,
    outcome,
    ms: Math.max(0, Math.round(now - run.questionShownAt)),
  };

  return {
    ...run,
    answers: [...run.answers, answer],
    lives: run.lives == null || outcome === "correct" ? run.lives : run.lives - 1,
  };
}

export function examReducer(state: ExamState, action: ExamAction): ExamState {
  const { game, settings } = state;

  switch (action.type) {
    case "UPDATE_SETTINGS": {
      if (game.screen !== "lobby") return state;
      const next = { ...settings, ...action.patch };
      // Os grupos pertencem ao alfabeto (ou aos kanji): ao trocar, a seleção é limpa (igual à Arena).
      if (groupsKey(next) !== groupsKey(settings) && action.patch.selectedGroupIds === undefined) next.selectedGroupIds = [];
      return { ...state, settings: next };
    }

    case "TOGGLE_GROUP":
      if (game.screen !== "lobby") return state;
      return { ...state, settings: { ...settings, selectedGroupIds: toggleGroupSelection(settings.selectedGroupIds, action.groupId) } };

    case "START": {
      if (game.screen === "question" || game.screen === "feedback" || action.items.length === 0) return state;

      const base = {
        id: action.id,
        mode: settings.mode,
        review: false,
        direction: settings.direction,
        questionCount: settings.mode === "survival" ? null : settings.questionCount,
        timeLimitMs: settings.mode === "lightning" ? settings.timeLimitSeconds * 1000 : null,
        autoAdvance: settings.autoAdvance,
        deck: action.items,
        weights: action.weights,
        queue: null,
        answers: [],
        lives: settings.mode === "survival" ? SURVIVAL_LIVES : null,
      };
      const question = nextQuestion(base, createRng(action.seed));
      if (!question) return state;

      return { ...state, game: { screen: "question", run: { ...base, question, questionShownAt: action.now } } };
    }

    case "ANSWER": {
      if (game.screen !== "question" || game.run.question.id !== action.questionId) return state;
      if (!Number.isInteger(action.optionIndex) || action.optionIndex < 0 || action.optionIndex >= game.run.question.options.length) {
        return state;
      }
      return { ...state, game: { screen: "feedback", run: resolve(game.run, action.optionIndex, action.now) } };
    }

    case "TIMEOUT":
      // Timeout atrasado (a pessoa respondeu no último frame) ou fora do Relâmpago: ignorado.
      if (game.screen !== "question" || game.run.question.id !== action.questionId || game.run.timeLimitMs == null) return state;
      return { ...state, game: { screen: "feedback", run: resolve(game.run, null, action.now) } };

    case "NEXT": {
      if (game.screen !== "feedback" || game.run.question.id !== action.questionId) return state;
      if (isRunFinished(game.run)) return { ...state, game: { screen: "result", run: game.run } };

      const question = nextQuestion(game.run, createRng(action.seed));
      if (!question) return { ...state, game: { screen: "result", run: game.run } };
      return { ...state, game: { screen: "question", run: { ...game.run, question, questionShownAt: action.now } } };
    }

    case "REVIEW_MISSES": {
      if (game.screen !== "result") return state;
      const rng = createRng(action.seed);
      const queue = shuffle(missedItems(game.run.answers), rng);
      if (queue.length === 0) return state;

      // A revisão é uma rodada fixa com os erros, sem tempo e sem vidas: o objetivo é rever, não arriscar.
      const base = {
        ...game.run,
        id: action.id,
        mode: "round" as const,
        review: true,
        questionCount: queue.length,
        timeLimitMs: null,
        queue,
        answers: [],
        lives: null,
      };
      const question = nextQuestion(base, rng);
      if (!question) return state;
      return { ...state, game: { screen: "question", run: { ...base, question, questionShownAt: action.now } } };
    }

    case "FINISH":
      if (game.screen !== "question" && game.screen !== "feedback") return state;
      return { ...state, game: game.run.answers.length === 0 ? { screen: "lobby" } : { screen: "result", run: game.run } };

    case "CLOSE":
      return game.screen === "result" ? { ...state, game: { screen: "lobby" } } : state;

    default:
      return state;
  }
}
