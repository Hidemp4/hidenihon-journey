import { useSyncExternalStore } from "react";
import type { ActivityId } from "../registry";
import { sessionKey, type SessionReward } from "./rewards";
import { progressionStore, type ProgressionView } from "./store";

/** XP, nível, troféus e liga de quem está logado (re-renderiza quando muda). */
export function useProgression(): ProgressionView {
  return useSyncExternalStore(progressionStore.subscribe, progressionStore.getSnapshot, progressionStore.getSnapshot);
}

/** O que uma sessão rendeu; `null` até a atividade gravar (ou se não rendeu nada). */
export function useSessionReward(activity: ActivityId, sessionId: string | null | undefined): SessionReward | null {
  const { rewards } = useProgression();
  if (!sessionId) return null;
  const key = sessionKey(activity, sessionId);
  return rewards.find((reward) => reward.key === key) ?? null;
}
