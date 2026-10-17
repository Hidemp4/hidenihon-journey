import type { TrainingKana } from "./kanaDeck";

export type TrainingMode = "quantity" | "free" | "timed";
export type KanaReactionDifficulty = "genin" | "chunin" | "jonin";

export interface KanaReactionSettings {
  alphabet: "hiragana" | "katakana" | "mixed";
  mode: TrainingMode;
  targetCount: number;
  timeLimitSeconds: number;
  difficulty: KanaReactionDifficulty;
  selectedGroupIds: string[];
  focusMode: boolean;
}

export interface KanaReactionPrompt {
  kana: TrainingKana;
  shownAt: number;
  firstKeyAt: number | null;
}

export interface KanaReactionAttempt {
  id: string;
  kana: string;
  romaji: string;
  answer: string;
  alphabet: TrainingKana["alphabet"];
  group: string;
  correct: boolean;
  reactionMs: number | null;
  completionMs: number;
  createdAt: string;
}

export interface KanaReactionSession {
  id: string;
  settings: KanaReactionSettings;
  startedAt: string;
  finishedAt: string | null;
  attempts: KanaReactionAttempt[];
}

export interface KanaReactionStats {
  total: number;
  correct: number;
  accuracy: number;
  averageReactionMs: number | null;
  averageCompletionMs: number | null;
  medianCompletionMs: number | null;
  fastestCompletionMs: number | null;
  weakKana: Array<{
    kana: string;
    romaji: string;
    averageCompletionMs: number;
    accuracy: number;
    attempts: number;
  }>;
}
