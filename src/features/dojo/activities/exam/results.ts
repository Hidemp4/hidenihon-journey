import { answerOf } from "@/features/dojo/shared/content";
import type { AnswerOutcome, ExamAnswer, ExamRun } from "./types";

export interface ExamMiss {
  questionId: string;
  prompt: string;
  /** Rótulo da alternativa escolhida; `null` = tempo esgotado. */
  chosen: string | null;
  correct: string;
  char: string;
  /** Romaji (kana) ou significado (kanji). */
  answer: string;
  outcome: Exclude<AnswerOutcome, "correct">;
}

export interface ExamResult {
  total: number;
  correct: number;
  /** 0–100 */
  score: number;
  /** Média só dos acertos (mesma régua das outras atividades: erro rápido não é velocidade). */
  averageMs: number | null;
  misses: ExamMiss[];
}

function promptOf({ question }: ExamAnswer) {
  return question.direction === "kana-to-romaji" ? question.item.char : answerOf(question.item);
}

export function summarizeExamRun(run: Pick<ExamRun, "answers">): ExamResult {
  const { answers } = run;
  const correctAnswers = answers.filter((answer) => answer.outcome === "correct");
  const total = answers.length;

  return {
    total,
    correct: correctAnswers.length,
    score: total === 0 ? 0 : Math.round((correctAnswers.length / total) * 100),
    averageMs:
      correctAnswers.length === 0
        ? null
        : Math.round(correctAnswers.reduce((sum, answer) => sum + answer.ms, 0) / correctAnswers.length),
    misses: answers.flatMap((answer) => {
      if (answer.outcome === "correct") return [];
      const { question } = answer;
      return [
        {
          questionId: question.id,
          prompt: promptOf(answer),
          chosen: answer.chosenIndex == null ? null : question.options[answer.chosenIndex].label,
          correct: question.options[question.correctIndex].label,
          char: question.item.char,
          answer: answerOf(question.item),
          outcome: answer.outcome,
        },
      ];
    }),
  };
}
