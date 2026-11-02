import type { StudyContent } from "@/features/dojo/shared/content";
import type { KanaAlphabet } from "@/features/dojo/shared/kanaDeck";
import type { StudyItem } from "@/features/dojo/shared/studyItem";

export type QuestionDirection = "kana-to-romaji" | "romaji-to-kana";
export type ExamDirection = QuestionDirection | "mixed";
/** Rodada (N perguntas), Sobrevivência (3 vidas) e Relâmpago (N perguntas com tempo por questão). */
export type ExamMode = "round" | "survival" | "lightning";
export type AnswerOutcome = "correct" | "wrong" | "timeout";

export interface ExamSettings {
  content: StudyContent;
  /** Só vale para kana. */
  alphabet: KanaAlphabet;
  selectedGroupIds: string[];
  direction: ExamDirection;
  mode: ExamMode;
  questionCount: number;
  timeLimitSeconds: number;
  /** Avança sozinho depois do feedback (senão espera Enter/clique). */
  autoAdvance: boolean;
}

export interface QuizOption {
  itemId: string;
  /** Romaji/significado (do caractere para a resposta) ou o caractere (no sentido inverso). */
  label: string;
}

export interface QuizQuestion {
  /** `idDaRodada:índice`: respostas e timeouts atrasados são ignorados se não baterem. */
  id: string;
  item: StudyItem;
  direction: QuestionDirection;
  options: QuizOption[];
  correctIndex: number;
}

export interface ExamAnswer {
  question: QuizQuestion;
  /** `null` quando o tempo acabou. */
  chosenIndex: number | null;
  outcome: AnswerOutcome;
  ms: number;
}

export interface ExamRun {
  id: string;
  mode: ExamMode;
  /** Rodada de "revisar só os erros" (fila fixa, sem tempo). */
  review: boolean;
  direction: ExamDirection;
  /** `null` na Sobrevivência (acaba quando as vidas acabam). */
  questionCount: number | null;
  timeLimitMs: number | null;
  autoAdvance: boolean;
  deck: StudyItem[];
  /** Pesos do domínio no início da rodada (quem erra mais aparece mais). */
  weights: ReadonlyMap<string, number>;
  /** Fila fixa da revisão dos erros; `null` = sorteio. */
  queue: StudyItem[] | null;
  question: QuizQuestion;
  questionShownAt: number;
  answers: ExamAnswer[];
  lives: number | null;
}
