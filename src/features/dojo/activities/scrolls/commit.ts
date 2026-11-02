import { recordActivity } from "@/features/dojo/shared/activityLog";
import { localDayNumber } from "@/features/dojo/shared/calendar";
import { masteryStore, type MasteryResult } from "@/features/dojo/shared/mastery";
import { recordIntroduced } from "./scrollsRepository";
import type { ScrollSession } from "./types";

/** Cada nota vai para o domínio (cada carta aparece uma vez por sessão). */
export function sessionToMasteryResults(session: ScrollSession): MasteryResult[] {
  return session.history.map((entry) => ({
    itemId: entry.card.item.id,
    outcome: entry.grade === "again" ? "wrong" : "correct",
    // Tempo até virar a carta = tempo para lembrar.
    ms: Math.max(0, entry.flippedAt - entry.shownAt),
    schedule: entry.toBox != null && entry.dueAt != null ? { box: entry.toBox, dueAt: entry.dueAt } : undefined,
  }));
}

/** Novos apresentados na revisão (contam no limite do dia; o treino livre não conta). */
export function countIntroduced(session: ScrollSession): number {
  if (session.mode !== "review") return 0;
  return session.history.filter((entry) => entry.card.isNew).length;
}

/**
 * Grava a sessão no domínio compartilhado e no contador de novos do dia.
 * Idempotente pelo id da sessão: pode ser chamada ao concluir e de novo ao sair da página.
 * Retorna `false` se algo não coube no armazenamento.
 */
export function commitScrollSession(session: ScrollSession): boolean {
  const results = sessionToMasteryResults(session);
  const last = session.history[session.history.length - 1];
  if (!last || results.length === 0) return true;

  const savedMastery = masteryStore.recordResults(results, { sourceId: session.id, now: last.gradedAt });
  const savedDaily = recordIntroduced(localDayNumber(last.gradedAt, session.offsetAt), session.id, countIntroduced(session));
  // Sequência e missão do dia: cartas avaliadas.
  const savedActivity = recordActivity("scrolls", results.length, { sourceId: session.id, now: last.gradedAt, offsetAt: session.offsetAt });
  return savedMastery && savedDaily && savedActivity;
}
