import { localDayNumber, localDaysBetween, startOfLocalDay, type UtcOffsetFn } from "@/features/dojo/shared/calendar";
import { GRADE_BOX, GRADE_INTERVAL_DAYS } from "./constants";
import type { ScrollGrade } from "./types";

export function intervalDays(grade: ScrollGrade): number {
  return GRADE_INTERVAL_DAYS[grade];
}

/**
 * Vencimento: meia-noite local do dia de destino. Errei vence hoje mesmo (já está vencida),
 * então a carta entra na próxima sessão de revisão; Acertei amanhã; Fácil daqui 3 dias.
 */
export function scheduleReview(grade: ScrollGrade, now: number, offsetAt: UtcOffsetFn) {
  const dueDay = localDayNumber(now, offsetAt) + intervalDays(grade);
  return { box: GRADE_BOX[grade], dueAt: startOfLocalDay(dueDay, offsetAt) };
}

export function describeDays(days: number): string {
  if (days <= 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}

/** Efeito da nota, do jeito que aparece no botão e no resumo. */
export function describeReturn(days: number): string {
  return days <= 0 ? "na próxima sessão" : describeDays(days);
}

/** "hoje" / "amanhã" / "em N dias" a partir de `now`, contando viradas de dia locais. */
export function describeDueAt(dueAt: number, now: number, offsetAt: UtcOffsetFn): string {
  return describeDays(localDaysBetween(now, dueAt, offsetAt));
}
