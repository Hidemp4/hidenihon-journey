import type { ActivityId } from "../registry";
import { standingFor } from "./ladder";
import type { MatchOutcome, MatchResult, UnrankedReason } from "./match";
import type { SessionReward } from "./rewards";
import { RANKED_ACTIVITIES, type RankedActivityId } from "./rules";

/** Textos do sistema de progresso (tela de resultado, hub e ranking). */

export const OUTCOME_LABELS: Readonly<Record<MatchOutcome, string>> = {
  win: "Vitória",
  draw: "Empate",
  loss: "Derrota",
};

const UNITS: Readonly<Record<RankedActivityId, [string, string]>> = {
  reflexes: ["resposta", "respostas"],
  exam: ["resposta", "respostas"],
  seals: ["par formado", "pares formados"],
  brush: ["caractere", "caracteres"],
};

export function unrankedText(reason: UnrankedReason, activity: ActivityId): string {
  switch (reason) {
    case "self-graded":
      return "Os Pergaminhos não valem troféus: quem dá a nota é você. O XP vale igual.";
    case "review":
      return "A revisão dos erros não vale troféus, só XP.";
    case "study":
      return "Estudar ordem não vale troféus nem XP: aqui você só observa.";
    case "too-short": {
      if (activity === "scrolls") return "Esta sessão não vale troféus.";
      const min = RANKED_ACTIVITIES[activity].minItems;
      const [one, many] = UNITS[activity];
      return `Partida curta: vale troféus a partir de ${min} ${min === 1 ? one : many}.`;
    }
  }
}

export function formatSigned(value: number) {
  if (value > 0) return `+${value}`;
  // Sinal de menos de verdade (−), não o hífen.
  if (value < 0) return `−${Math.abs(value)}`;
  return "0";
}

export function trophiesText(count: number) {
  return `${count.toLocaleString("pt-BR")} ${Math.abs(count) === 1 ? "troféu" : "troféus"}`;
}

/** Mudou de divisão (ou de liga) nesta sessão? */
export function divisionChange(reward: SessionReward) {
  const before = standingFor(reward.before.trophies);
  const after = standingFor(reward.after.trophies);
  if (before.label === after.label) return null;
  return { up: reward.after.trophies > reward.before.trophies, label: after.label, newLeague: after.leagueIndex !== before.leagueIndex };
}

/** O texto que o leitor de tela ouve quando a recompensa chega. */
export function describeReward(reward: SessionReward): string {
  const parts: string[] = [];
  const { match } = reward;
  if (match.ranked) parts.push(`${OUTCOME_LABELS[match.outcome]}: ${formatSigned(match.trophies)} ${Math.abs(match.trophies) === 1 ? "troféu" : "troféus"}.`);
  if (reward.xp > 0) parts.push(`${formatSigned(reward.xp)} XP.`);
  const change = divisionChange(reward);
  if (change) parts.push(`${change.up ? "Subiu para" : "Caiu para"} ${change.label}.`);
  if (reward.levelUp) parts.push(`Chegou ao nível ${reward.levelUp}.`);
  return parts.join(" ");
}

/** Uma linha sobre a partida (histórico do ranking). */
export function matchLine(match: MatchResult, activity: ActivityId): string {
  if ("reason" in match) return unrankedText(match.reason, activity);
  return `${OUTCOME_LABELS[match.outcome]} (desempenho ${match.performance}, meta ${match.meta})`;
}
