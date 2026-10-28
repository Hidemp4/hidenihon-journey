import type { KanaAlphabet, TrainingKana } from "./kanaDeck";

export type TrainingMode = "quantity" | "free" | "timed";
export type DojoDifficulty = "genin" | "chunin" | "jonin";
export type AttemptOutcome = "correct" | "wrong" | "timeout";

export interface DojoSettings {
  alphabet: KanaAlphabet;
  mode: TrainingMode;
  targetCount: number;
  timeLimitSeconds: number;
  difficulty: DojoDifficulty;
  selectedGroupIds: string[];
  /** Remove animações e efeitos durante o treino. */
  focusMode: boolean;
}

export interface DojoPrompt {
  /** Identifica o prompt: timers e respostas atrasadas são ignorados se o id não bater. */
  id: string;
  kana: TrainingKana;
  /** `null` até o kana ter sido de fato pintado na tela. */
  shownAt: number | null;
  firstKeyAt: number | null;
}

export interface DojoAttempt {
  id: string;
  kana: string;
  romaji: string;
  answer: string;
  alphabet: TrainingKana["alphabet"];
  /** Id do grupo (`alphabet:group`). */
  group: string;
  outcome: AttemptOutcome;
  reactionMs: number | null;
  completionMs: number;
  createdAt: string;
}

export interface DojoSession {
  id: string;
  settings: DojoSettings;
  startedAt: string;
  finishedAt: string | null;
  attempts: DojoAttempt[];
}

export interface WeakKana {
  kana: string;
  romaji: string;
  /** Média apenas dos acertos; `null` se nunca acertou. */
  averageCompletionMs: number | null;
  accuracy: number;
  attempts: number;
  misses: number;
}

export interface DojoStats {
  total: number;
  correct: number;
  wrong: number;
  timeouts: number;
  accuracy: number;
  averageReactionMs: number | null;
  /** Velocidade considera só os acertos (erros e timeouts distorcem a média). */
  averageCompletionMs: number | null;
  medianCompletionMs: number | null;
  fastestCompletionMs: number | null;
  weakKana: WeakKana[];
}
