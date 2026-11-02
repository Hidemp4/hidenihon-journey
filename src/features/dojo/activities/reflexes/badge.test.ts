import { describe, expect, it } from "vitest";
import { describeReflexesBadge } from "./badge";
import { DEFAULT_DOJO_SETTINGS, MIN_CORRECT_FOR_RECORD } from "./constants";
import type { AttemptOutcome, DojoAttempt, DojoSession } from "./types";

function attempt(outcome: AttemptOutcome, completionMs: number): DojoAttempt {
  return {
    id: `${outcome}-${completionMs}`,
    kana: "あ",
    romaji: "a",
    answer: "a",
    alphabet: "hiragana",
    group: "hiragana:a-row",
    outcome,
    reactionMs: 100,
    completionMs,
    createdAt: new Date(0).toISOString(),
  };
}

function session(id: string, attempts: DojoAttempt[]): DojoSession {
  return { id, settings: DEFAULT_DOJO_SETTINGS, startedAt: new Date(0).toISOString(), finishedAt: null, attempts };
}

/** Sessão só de acertos com o mesmo tempo (a média fica igual a `ms`). */
function corrects(ms: number, count = MIN_CORRECT_FOR_RECORD): DojoAttempt[] {
  return Array.from({ length: count }, () => attempt("correct", ms));
}

describe("badge da Arena de Reflexos", () => {
  it("mostra a menor média de acertos entre as sessões que valem recorde", () => {
    const badge = describeReflexesBadge([
      session("lenta", corrects(800)),
      // Erros não entram na média (mesma regra do placar): os 300ms do erro não puxam o recorde para baixo.
      session("rapida", [...corrects(500), attempt("wrong", 300)]),
      session("so-erros", [attempt("wrong", 100), attempt("timeout", 5000)]),
    ]);

    expect(badge).toEqual({ text: "Melhor média 500ms", tone: "accent" });
  });

  it(`sessão com menos de ${MIN_CORRECT_FOR_RECORD} acertos não vira recorde`, () => {
    const short = session("curta", corrects(200, MIN_CORRECT_FOR_RECORD - 1));

    expect(describeReflexesBadge([short, session("valida", corrects(650))]).text).toBe("Melhor média 650ms");
    expect(describeReflexesBadge([short])).toEqual({
      text: `Recorde a partir de ${MIN_CORRECT_FOR_RECORD} acertos`,
      tone: "neutral",
    });
  });

  it("sem sessões guardadas, convida para a primeira batalha", () => {
    expect(describeReflexesBadge([])).toEqual({ text: "Nenhuma batalha ainda", tone: "neutral" });
  });
});
