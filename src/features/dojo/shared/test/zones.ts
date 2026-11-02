import type { UtcOffsetFn } from "../calendar";

/** Fusos sintéticos para os testes não dependerem do fuso da máquina. */
export const SAO_PAULO: UtcOffsetFn = () => -180;
export const TOKYO: UtcOffsetFn = () => 540;

const NY_DST_START = Date.UTC(2026, 2, 8, 7); // 2026-03-08 02:00 EST → 03:00 EDT
const NY_DST_END = Date.UTC(2026, 10, 1, 6); // 2026-11-01 02:00 EDT → 01:00 EST
/** Nova York em 2026: -4h no horário de verão, -5h fora dele. */
export const NEW_YORK: UtcOffsetFn = (epochMs) => (epochMs >= NY_DST_START && epochMs < NY_DST_END ? -240 : -300);

/** Um fuso que pulava a meia-noite no horário de verão (como o Brasil até 2019): 00:00 vira 01:00. */
export const MIDNIGHT_GAP_TRANSITION = Date.UTC(2026, 9, 18, 3); // 18/10 00:00 a -3h
export const MIDNIGHT_GAP: UtcOffsetFn = (epochMs) => (epochMs >= MIDNIGHT_GAP_TRANSITION ? -120 : -180);
