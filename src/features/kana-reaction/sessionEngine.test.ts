import { describe, expect, it } from "vitest";
import { getKanaDeck } from "./kanaDeck";
import { ADVANCED_RESPONSE_LIMIT_MS, createPrompt, createTimeoutAttempt } from "./sessionEngine";

describe("advanced reaction timeout", () => {
  it("registra o limite de cinco segundos como tentativa incorreta", () => {
    const kana = getKanaDeck("hiragana")[0];
    const prompt = createPrompt(kana, 1_000);

    const attempt = createTimeoutAttempt(prompt);

    expect(ADVANCED_RESPONSE_LIMIT_MS).toBe(5_000);
    expect(attempt.answer).toBe("");
    expect(attempt.correct).toBe(false);
    expect(attempt.reactionMs).toBeNull();
    expect(attempt.completionMs).toBe(5_000);
    expect(attempt.kana).toBe(kana.char);
  });
});
