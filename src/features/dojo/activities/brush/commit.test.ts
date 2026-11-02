import { countsForDay, loadActivityLog } from "@/features/dojo/shared/activityLog";
import { localDayNumber, systemUtcOffset } from "@/features/dojo/shared/calendar";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadMastery } from "@/features/dojo/shared/mastery";
import { createMemoryStorage } from "@/features/dojo/shared/test/memoryStorage";
import { describeBrushBadge, getBrushBadge } from "./badge";
import { loadPracticed } from "./brushRepository";
import { commitBrushSession, hasProgress, sessionToMasteryResults } from "./commit";
import { BOTTOM, TOP, draw, keyOf, run, sessionOf, startBrush } from "./testUtils";

/** Traçar: 1º kana sem erro, 2º com a direção invertida uma vez. */
function tracedSession() {
  let state = draw(startBrush("trace"), TOP, BOTTOM);
  state = run(state, { type: "NEXT", cardKey: keyOf(state) });
  state = draw(state, [...TOP].reverse(), TOP, BOTTOM);
  state = run(state, { type: "NEXT", cardKey: keyOf(state) });
  return sessionOf(state);
}

describe("gravação do Pincel", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("cada kana avaliado vira um resultado; Estudar ordem não conta", () => {
    expect(sessionToMasteryResults(tracedSession())).toEqual([
      { itemId: "hiragana:あ", outcome: "correct" },
      { itemId: "hiragana:い", outcome: "wrong" },
    ]);

    const study = run(startBrush("study"), { type: "NEXT", cardKey: "s1:0" });
    expect(sessionToMasteryResults(sessionOf(study))).toEqual([]);
    expect(hasProgress(sessionOf(study))).toBe(false);
    expect(commitBrushSession(sessionOf(study), 1)).toBe(true);
    expect(localStorage.getItem("hidenihon:dojo:brush:v1")).toBeNull();
  });

  it("grava domínio e praticados, uma vez só", () => {
    const session = tracedSession();
    expect(hasProgress(session)).toBe(true);
    expect(commitBrushSession(session, 77)).toBe(true);
    expect(commitBrushSession(session, 88)).toBe(true);
    expect(countsForDay(loadActivityLog(), localDayNumber(77, systemUtcOffset))).toEqual({ brush: 2 });

    const items = loadMastery().items;
    expect(items["hiragana:あ"]).toMatchObject({ seen: 1, correct: 1 });
    expect(items["hiragana:い"]).toMatchObject({ seen: 1, correct: 0 });
    expect(Object.keys(loadPracticed())).toEqual(["hiragana:あ", "hiragana:い"]);
    expect(getBrushBadge()).toEqual({ text: "2 kana praticados", tone: "accent" });
  });

  it("quota cheia: avisa (false), sem lançar", () => {
    vi.stubGlobal("localStorage", createMemoryStorage({ failOnSet: () => true }));
    expect(commitBrushSession(tracedSession(), 1)).toBe(false);
  });

  it("badge: nenhum, singular, só kanji e kana + kanji (cada um contado à parte)", () => {
    const one = { bestScore: 1, lastAt: 1 };
    expect(describeBrushBadge({})).toEqual({ text: "Nenhum kana praticado", tone: "neutral" });
    expect(describeBrushBadge({ "katakana:ア": one })).toEqual({ text: "1 kana praticado", tone: "accent" });
    expect(describeBrushBadge({ "kanji:日": one, "kanji:月": one })).toEqual({ text: "2 kanji praticados", tone: "accent" });
    expect(describeBrushBadge({ "katakana:ア": one, "kanji:日": one })).toEqual({ text: "1 kana · 1 kanji praticados", tone: "accent" });
  });
});
