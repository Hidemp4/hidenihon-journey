import { ADVANCED_RESPONSE_LIMIT_MS, DEFAULT_DOJO_SETTINGS } from "./constants";
import type { TrainingKana } from "./kanaDeck";
import { evaluateAnswer, normalizeAnswer } from "./romaji";
import type {
  AttemptOutcome,
  DojoAttempt,
  DojoPrompt,
  DojoSettings,
} from "./types";

export { ADVANCED_RESPONSE_LIMIT_MS, DEFAULT_DOJO_SETTINGS };

/**
 * Tudo que é "impuro" (relógio, aleatório, ids) entra por aqui,
 * assim o reducer e as funções do engine ficam determinísticos e testáveis.
 */
export interface Stamp {
  /** performance.now() */
  now: number;
  isoNow: string;
  random: number;
  attemptId: string;
  promptId: string;
}

export function createId(): string {
  const cryptoApi = globalThis.crypto;
  // randomUUID só existe em contexto seguro (https/localhost); no celular via IP local não.
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createStamp(): Stamp {
  return {
    now: performance.now(),
    isoNow: new Date().toISOString(),
    random: Math.random(),
    attemptId: createId(),
    promptId: createId(),
  };
}

function getRecentWindowSize(deckSize: number) {
  return Math.min(Math.max(3, Math.floor(deckSize / 3)), 8);
}

function weightedPick<T>(items: readonly T[], weightOf: (item: T) => number, random: number): T {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  let threshold = Math.min(Math.max(random, 0), 0.999999) * total;

  for (const item of items) {
    threshold -= weightOf(item);
    if (threshold < 0) return item;
  }

  return items[items.length - 1];
}

/**
 * Sorteia o próximo kana evitando repetir os recentes.
 * `weights` (opcional) aumenta a chance de kana em que a pessoa errou.
 */
export function pickNextKana(
  deck: readonly TrainingKana[],
  recentKana: readonly string[] = [],
  random: number = Math.random(),
  weights?: ReadonlyMap<string, number>
): TrainingKana | null {
  if (deck.length === 0) return null;
  if (deck.length === 1) return deck[0];

  // Nunca bloqueia o deck inteiro: sempre sobra pelo menos um kana diferente dos recentes.
  const windowSize = Math.min(getRecentWindowSize(deck.length), deck.length - 1);
  const blocked = new Set(recentKana.slice(-windowSize));
  const available = deck.filter((kana) => !blocked.has(kana.char));
  const candidates = available.length > 0 ? available : deck;

  return weightedPick(candidates, (kana) => weights?.get(kana.char) ?? 1, random);
}

/** Erros sobem o peso do kana (+2, máx. 5); acertos descem (-1, mín. 1). */
export function buildMissWeights(attempts: readonly DojoAttempt[]): Map<string, number> {
  const weights = new Map<string, number>();

  for (const attempt of attempts) {
    const current = weights.get(attempt.kana) ?? 1;
    weights.set(attempt.kana, attempt.outcome === "correct" ? Math.max(1, current - 1) : Math.min(5, current + 2));
  }

  return weights;
}

export function createPrompt(kana: TrainingKana, id: string = createId()): DojoPrompt {
  return { id, kana, shownAt: null, firstKeyAt: null };
}

/** Marca o momento em que o kana foi pintado na tela. */
export function markShown(prompt: DojoPrompt, now: number): DojoPrompt {
  if (prompt.shownAt != null) return prompt;
  return { ...prompt, shownAt: now };
}

export function markFirstKey(prompt: DojoPrompt, now: number): DojoPrompt {
  if (prompt.firstKeyAt != null) return prompt;
  return { ...prompt, shownAt: prompt.shownAt ?? now, firstKeyAt: now };
}

export function createAttempt(
  prompt: DojoPrompt,
  answer: string,
  stamp: Stamp,
  outcome?: AttemptOutcome
): DojoAttempt {
  const normalizedAnswer = normalizeAnswer(answer);
  const shownAt = prompt.shownAt ?? stamp.now;
  const resolvedOutcome: AttemptOutcome =
    outcome ?? (evaluateAnswer(prompt.kana.romaji, normalizedAnswer) === "correct" ? "correct" : "wrong");

  return {
    id: stamp.attemptId,
    kana: prompt.kana.char,
    romaji: prompt.kana.romaji,
    answer: normalizedAnswer,
    alphabet: prompt.kana.alphabet,
    group: prompt.kana.groupId,
    outcome: resolvedOutcome,
    reactionMs: prompt.firstKeyAt == null ? null : Math.max(0, Math.round(prompt.firstKeyAt - shownAt)),
    completionMs: Math.max(0, Math.round(stamp.now - shownAt)),
    createdAt: stamp.isoNow,
  };
}

export function createTimeoutAttempt(prompt: DojoPrompt, stamp: Stamp): DojoAttempt {
  const shownAt = prompt.shownAt ?? stamp.now;
  return createAttempt(prompt, "", { ...stamp, now: shownAt + ADVANCED_RESPONSE_LIMIT_MS }, "timeout");
}

export function shouldFinishSession(settings: DojoSettings, attemptCount: number) {
  return settings.mode === "quantity" && attemptCount >= settings.targetCount;
}
