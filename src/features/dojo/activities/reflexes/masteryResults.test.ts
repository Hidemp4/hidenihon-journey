import { describe, expect, it } from "vitest";
import { attemptsToMasteryResults } from "./masteryResults";
import type { DojoAttempt } from "./types";

function attempt(overrides: Partial<DojoAttempt>): DojoAttempt {
  return {
    id: "a",
    kana: "あ",
    romaji: "a",
    answer: "a",
    alphabet: "hiragana",
    group: "hiragana:a-row",
    outcome: "correct",
    reactionMs: 100,
    completionMs: 450,
    createdAt: new Date(0).toISOString(),
    ...overrides,
  };
}

describe("tentativas da Arena → mastery", () => {
  it("usa o id alphabet:char e trata timeout como erro", () => {
    expect(
      attemptsToMasteryResults([
        attempt({}),
        attempt({ kana: "ア", alphabet: "katakana", outcome: "wrong", completionMs: 800 }),
        attempt({ kana: "い", outcome: "timeout", completionMs: 5000 }),
      ])
    ).toEqual([
      { itemId: "hiragana:あ", outcome: "correct", ms: 450 },
      { itemId: "katakana:ア", outcome: "wrong", ms: 800 },
      { itemId: "hiragana:い", outcome: "wrong", ms: 5000 },
    ]);
  });
});
