import { useEffect, useLayoutEffect } from "react";
import { useAuthContext } from "@/contexts/auth-context-core";
import { progressionStore } from "../store";

/**
 * Diz ao progresso quem está logado (cada conta tem o seu XP) e reenvia o que ficou pendente quando a
 * conexão volta. Fica uma vez só, nas rotas do Dojô.
 */
export function ProgressionSync() {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;

  // Antes da pintura: o hub não chega a mostrar os números de outra conta.
  useLayoutEffect(() => {
    progressionStore.setUser(userId);
  }, [userId]);

  useEffect(() => {
    const retry = () => void progressionStore.sync();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []);

  return null;
}
