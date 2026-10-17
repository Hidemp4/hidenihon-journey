import type { TrainingKana } from "./kanaDeck";
import type { KanaReactionAttempt, KanaReactionPrompt, KanaReactionSettings } from "./types";

export const DEFAULT_REACTION_SETTINGS: KanaReactionSettings = {
  alphabet: "hiragana",
  mode: "quantity",
  targetCount: 20,
  timeLimitSeconds: 60,
  difficulty: "genin",
  selectedGroupIds: [],
  focusMode: false,
};

export function pickNextKana(deck: TrainingKana[], recentKana: string[] = [], focusMode = false) {
  if (deck.length === 0) return null;
  if (deck.length === 1) return deck[0];

  const recentWindowSize = focusMode ? 1 : Math.min(Math.max(3, Math.floor(deck.length / 3)), 8);
  const blockedKana = new Set(recentKana.slice(-recentWindowSize));
  const availableDeck = deck.filter((kana) => !blockedKana.has(kana.char));
  const candidates = availableDeck.length > 0 ? availableDeck : deck;

  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function createPrompt(kana: TrainingKana, now = performance.now()): KanaReactionPrompt {
  return {
    kana,
    shownAt: now,
    firstKeyAt: null,
  };
}

export function markFirstKey(prompt: KanaReactionPrompt, now = performance.now()): KanaReactionPrompt {
  if (prompt.firstKeyAt != null) return prompt;
  return { ...prompt, firstKeyAt: now };
}

export function createAttempt(prompt: KanaReactionPrompt, answer: string, now = performance.now()): KanaReactionAttempt {
  const normalizedAnswer = answer.trim().toLowerCase();

  return {
    id: crypto.randomUUID(),
    kana: prompt.kana.char,
    romaji: prompt.kana.romaji,
    answer: normalizedAnswer,
    alphabet: prompt.kana.alphabet,
    group: prompt.kana.group,
    correct: normalizedAnswer === prompt.kana.romaji.toLowerCase(),
    reactionMs: prompt.firstKeyAt == null ? null : Math.max(0, Math.round(prompt.firstKeyAt - prompt.shownAt)),
    completionMs: Math.max(0, Math.round(now - prompt.shownAt)),
    createdAt: new Date().toISOString(),
  };
}

export function shouldFinishSession(settings: KanaReactionSettings, attemptCount: number) {
  return settings.mode === "quantity" && attemptCount >= settings.targetCount;
}
