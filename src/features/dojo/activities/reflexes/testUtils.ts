import type { Stamp } from "./sessionEngine";

/** Gera stamps determinísticos para os testes. */
export function createStampFactory(startAt = 1_000) {
  let counter = 0;

  return function nextStamp(overrides: Partial<Stamp> = {}): Stamp {
    counter += 1;
    return {
      now: startAt + counter * 100,
      isoNow: new Date(2026, 0, 1, 12, 0, counter).toISOString(),
      random: 0,
      attemptId: `attempt-${counter}`,
      promptId: `prompt-${counter}`,
      ...overrides,
    };
  };
}
