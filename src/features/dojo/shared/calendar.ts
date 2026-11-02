/**
 * Dias de calendário no fuso da pessoa. "Revisar amanhã" é virar o dia no relógio dela,
 * não daqui a 24h (horário de verão tem dias de 23h e 25h).
 *
 * O fuso entra como função (`offsetAt`) para tudo continuar puro e testável com qualquer fuso;
 * só a borda (hooks/stores) usa `systemUtcOffset`.
 */

export const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;

/** Minutos a leste de UTC no instante dado (Brasília = -180, Tóquio = +540). */
export type UtcOffsetFn = (epochMs: number) => number;

export const systemUtcOffset: UtcOffsetFn = (epochMs) => -new Date(epochMs).getTimezoneOffset();

/** Número do dia local (dias desde 1970-01-01 no relógio da pessoa). */
export function localDayNumber(epochMs: number, offsetAt: UtcOffsetFn): number {
  return Math.floor((epochMs + offsetAt(epochMs) * MINUTE_MS) / DAY_MS);
}

/** Epoch do primeiro instante (00:00 local) do dia `day`. */
export function startOfLocalDay(day: number, offsetAt: UtcOffsetFn): number {
  const wallMidnight = day * DAY_MS;
  // O fuso de "agora" pode não ser o da meia-noite (troca de horário no meio): o 2º passo corrige.
  const firstGuess = wallMidnight - offsetAt(wallMidnight) * MINUTE_MS;
  const corrected = wallMidnight - offsetAt(firstGuess) * MINUTE_MS;
  // Se a meia-noite não existe (horário de verão começando às 00:00), o 2º passo cai no dia anterior:
  // aí o dia começa no próprio instante da troca, que é o 1º palpite.
  return localDayNumber(corrected, offsetAt) === day ? corrected : firstGuess;
}

/** Quantos dias de calendário separam dois instantes (0 = mesmo dia local). */
export function localDaysBetween(fromMs: number, toMs: number, offsetAt: UtcOffsetFn): number {
  return localDayNumber(toMs, offsetAt) - localDayNumber(fromMs, offsetAt);
}
