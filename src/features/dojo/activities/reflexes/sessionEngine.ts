import { createId } from "@/features/dojo/shared/ids";
import { ADVANCED_RESPONSE_LIMIT_MS, DEFAULT_DOJO_SETTINGS } from "./constants";
import type { TrainingKana } from "@/features/dojo/shared/kanaDeck";
import { evaluateAnswer, normalizeAnswer } from "@/features/dojo/shared/romaji";
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

// Mudou para shared/ids (os Pergaminhos também geram ids); reexportado para quem já importava daqui.
export { createId };

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

/**
 * Pesos persistidos do domínio (por id `alfabeto:kana`) no formato da Arena (por kana).
 * Kana sem histórico ficam de fora (= peso 1).
 */
export function masteryWeightsForDeck(deck: readonly TrainingKana[], mastery: ReadonlyMap<string, number>): Map<string, number> {
  const weights = new Map<string, number>();
  for (const kana of deck) {
    const weight = mastery.get(`${kana.alphabet}:${kana.char}`);
    if (weight != null) weights.set(kana.char, weight);
  }
  return weights;
}

/**
 * Peso final do sorteio: parte do domínio (o que a pessoa erra em todas as atividades) e soma
 * os erros desta sessão. Sem histórico, o domínio vale 1 e o resultado é igual ao de antes.
 */
export function combineWeights(mastery: ReadonlyMap<string, number>, session: ReadonlyMap<string, number>): Map<string, number> {
  const combined = new Map<string, number>();
  for (const char of new Set([...mastery.keys(), ...session.keys()])) {
    const base = mastery.get(char) ?? 1;
    const extra = (session.get(char) ?? 1) - 1;
    combined.set(char, Math.min(5, Math.max(1, base + extra)));
  }
  return combined;
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
  return { id, kana, shownAt: null, firstKeyAt: null, lastKeyAt: null };
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

/** Cada tecla que muda a resposta: guarda a primeira (reação) e a última (fim da digitação). */
export function markKeystroke(prompt: DojoPrompt, now: number): DojoPrompt {
  return { ...markFirstKey(prompt, now), lastKeyAt: now };
}

/**
 * Quando a resposta ficou pronta: na última tecla digitada, não no Enter (ou Espaço) que a confirma.
 * Assim a confirmação não pesa no tempo, e a régua de velocidade (rótulos, domínio, troféus) segue a
 * mesma de quando a resposta valia sozinha, ao terminar de digitar.
 */
export function answeredAt(prompt: DojoPrompt, confirmedAt: number) {
  return prompt.lastKeyAt == null ? confirmedAt : Math.min(prompt.lastKeyAt, confirmedAt);
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
