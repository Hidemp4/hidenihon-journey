import type { MasteryResult } from "@/features/dojo/shared/mastery";
import { studyItemId } from "@/features/dojo/shared/studyItem";
import type { DojoAttempt } from "./types";

/** Timeout conta como erro: para o domínio do kana, não lembrar a tempo é não lembrar. */
export function attemptsToMasteryResults(attempts: readonly DojoAttempt[]): MasteryResult[] {
  return attempts.map((attempt) => ({
    itemId: studyItemId(attempt.alphabet, attempt.kana),
    outcome: attempt.outcome === "correct" ? "correct" : "wrong",
    ms: attempt.completionMs,
  }));
}
