import { useEffect, useRef } from "react";

/**
 * Grava o que está pendente quando a pessoa sai da atividade no meio: link "← Dojô", menu flutuante,
 * voltar do navegador (desmontagem) ou fechar/recarregar a aba (`pagehide`).
 *
 * O cleanup de desmontagem só enxerga o estado da 1ª renderização, então o pendente é espelhado num ref.
 * `save` precisa ser idempotente (sair pode disparar os dois caminhos) e é lido só na montagem:
 * passe uma função de módulo, não uma closure que muda a cada render.
 */
export function useSaveOnExit<T>(pending: T | null, save: (value: T) => void) {
  const pendingRef = useRef<T | null>(null);
  const saveRef = useRef(save);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    const flush = () => {
      const value = pendingRef.current;
      if (value != null) saveRef.current(value);
    };

    // `persisted`: a página foi para o cache de voltar/avançar e pode voltar com a atividade rolando.
    // Gravar aí fecharia a sessão antes da hora (o resto das respostas não entraria), então só no descarte real.
    const handlePageHide = (event: PageTransitionEvent) => {
      if (!event.persisted) flush();
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      flush();
    };
  }, []);
}
