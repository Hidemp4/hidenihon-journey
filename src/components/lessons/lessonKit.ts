import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, PartyPopper, ThumbsUp } from "lucide-react";

/** Junta classes ignorando valores falsos. */
export const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

/** Fonte usada para caracteres japoneses (classe Tailwind arbitrária). */
export const JP_FONT = "font-['M_PLUS_Rounded_1c','Noto_Sans_JP',sans-serif]";

export function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export const scorePercent = (correct: number, total: number) =>
  total ? Math.round((correct / total) * 100) : 0;

/** Faixa de resultado única, usada por todos os exercícios. */
export function getResultTone(percent: number) {
  if (percent >= 80) return { Icon: PartyPopper, jp: "素晴らしい", label: "Excelente!" };
  if (percent >= 60) return { Icon: ThumbsUp, jp: "良い", label: "Bom trabalho!" };
  return { Icon: Flame, jp: "頑張って", label: "Continue treinando!" };
}

/**
 * Garante que a finalização de um exercício rode uma única vez
 * (resposta final, pular ou tempo esgotado).
 */
export function useFinishOnce() {
  const doneRef = useRef(false);
  const [finished, setFinished] = useState(false);

  const finishOnce = useCallback((fn: () => void) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFinished(true);
    fn();
  }, []);

  return { finished, finishOnce, doneRef };
}

/**
 * Contagem regressiva em segundos. `onExpire` roda fora do setState,
 * sempre com a versão mais recente do callback.
 */
export function useCountdown(seconds: number, active: boolean, onExpire: () => void) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(t - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (active && timeLeft === 0) expireRef.current();
  }, [active, timeLeft]);

  return timeLeft;
}