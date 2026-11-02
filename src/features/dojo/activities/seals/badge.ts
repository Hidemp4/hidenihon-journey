import type { ActivityBadge } from "@/features/dojo/registry";
import { getBoardSize } from "./constants";
import { sizeIdOfConfigKey } from "./pairs";
import { loadSealsBests, type SealsBests } from "./sealsRepository";

/** Mostra o recorde mais recente: é o tabuleiro que a pessoa está treinando agora. */
export function describeSealsBadge(bests: SealsBests): ActivityBadge {
  const latest = Object.entries(bests).sort(([, a], [, b]) => b.finishedAt - a.finishedAt)[0];
  const sizeId = latest ? sizeIdOfConfigKey(latest[0]) : null;
  if (!latest || !sizeId) return { text: "Nenhuma partida ainda", tone: "neutral" };
  return { text: `Melhor ${getBoardSize(sizeId).label}: ${latest[1].moves} jogadas`, tone: "accent" };
}

export function getSealsBadge(): ActivityBadge {
  return describeSealsBadge(loadSealsBests());
}
