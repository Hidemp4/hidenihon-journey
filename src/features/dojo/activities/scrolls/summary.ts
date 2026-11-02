import { localDaysBetween, type UtcOffsetFn } from "@/features/dojo/shared/calendar";
import type { ScrollGrade, ScrollSession } from "./types";

export interface ScrollSummary {
  grades: Record<ScrollGrade, number>;
  /** Cartas avaliadas (cada carta aparece uma vez por sessão). */
  reviewed: number;
  /** Vencimentos agendados nesta sessão, agrupados por dias a partir de hoje (0 = próxima sessão). */
  upcoming: Array<{ days: number; count: number }>;
}

export function summarizeScrollSession(session: ScrollSession, now: number, offsetAt: UtcOffsetFn): ScrollSummary {
  const grades: Record<ScrollGrade, number> = { again: 0, good: 0, easy: 0 };
  for (const entry of session.history) grades[entry.grade] += 1;

  const byDay = new Map<number, number>();
  for (const { dueAt } of session.history) {
    if (dueAt == null) continue;
    const days = Math.max(0, localDaysBetween(now, dueAt, offsetAt));
    byDay.set(days, (byDay.get(days) ?? 0) + 1);
  }

  return {
    grades,
    reviewed: session.history.length,
    upcoming: [...byDay.entries()].sort(([a], [b]) => a - b).map(([days, count]) => ({ days, count })),
  };
}
