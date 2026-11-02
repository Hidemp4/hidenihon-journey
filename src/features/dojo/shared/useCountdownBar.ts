import { useEffect, useRef, useState } from "react";

export type CountdownLevel = "high" | "mid" | "low";

/**
 * Contagem regressiva por questão. A barra é movida direto no DOM (transform) e só o texto
 * de segundos usa estado: a página inteira não re-renderiza a cada frame.
 *
 * `onExpire` recebe `expireKey` (id da questão/prompt) para quem chama ignorar expirações atrasadas;
 * passe um `onExpire` estável (useCallback), senão a contagem reinicia a cada render.
 * `startedAt` nulo = ainda não começou (ex.: esperando o kana ser pintado).
 */
export function useCountdownBar<K>(durationMs: number, startedAt: number | null, onExpire: (key: K) => void, expireKey: K) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [seconds, setSeconds] = useState(Math.ceil(durationMs / 1000));
  const [level, setLevel] = useState<CountdownLevel>("high");

  useEffect(() => {
    if (startedAt == null) return;

    let frameId = 0;
    const tick = () => {
      const remaining = Math.max(0, durationMs - (performance.now() - startedAt));
      const ratio = remaining / durationMs;

      if (barRef.current) barRef.current.style.transform = `scaleX(${ratio})`;
      setSeconds(Math.ceil(remaining / 1000));
      setLevel(ratio <= 0.3 ? "low" : ratio <= 0.6 ? "mid" : "high");

      if (remaining <= 0) {
        onExpire(expireKey); // quem recebe ignora se a questão já foi resolvida
        return;
      }
      frameId = requestAnimationFrame(tick);
    };

    tick();
    return () => cancelAnimationFrame(frameId);
  }, [durationMs, expireKey, onExpire, startedAt]);

  return { barRef, seconds, level };
}
