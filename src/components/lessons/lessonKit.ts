import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, PartyPopper, ThumbsUp } from "lucide-react";

/** Junta classes ignorando valores falsos. */
export const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

// ---- botões (usados pelo <Button> e por <Link> com cara de botão) ----------

export type ButtonVariant = "primary" | "ghost" | "dark";
export type ButtonSize = "md" | "sm";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary:
    "border-journey-gold/60 bg-journey-orange text-white shadow-[0_5px_0_hsl(var(--journey-orange)/.45)] hover:bg-journey-orange-hover",
  ghost: "border-journey-wood/20 bg-white text-journey-ink shadow-[0_4px_0_hsl(var(--journey-wood)/.12)] hover:border-journey-orange/40",
  dark: "border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep text-white shadow-[0_4px_0_hsl(var(--journey-wood-deep)/.45)] hover:text-journey-gold",
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  md: "min-h-14 w-full px-6 text-sm",
  sm: "min-h-11 px-4 text-xs",
};

/** Classes do botão, para usar também em `<Link>` (navegação é link, não botão). */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-2xl border-2 font-black outline-none transition focus-visible:ring-4 focus-visible:ring-journey-orange/40 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none",
    BUTTON_VARIANT[variant],
    BUTTON_SIZE[size],
    className
  );
}

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