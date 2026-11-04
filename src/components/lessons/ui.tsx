import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { FastForward } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buttonClass, cx, type ButtonSize, type ButtonVariant } from "./lessonKit";

/*
 * Peças das lições no estilo da Trilha e do Dojô: tokens `journey-*`, bordas grossas, sombra
 * "dura" de baixo (clima de interface de jogo) e moldura floresta/madeira nos destaques.
 */

/* ---------- Eyebrow ---------- */

const EYEBROW_TONE = {
  /** Dourado, sobre o verde-floresta. */
  accent: "text-journey-gold",
  muted: "text-journey-wood",
  primary: "text-journey-orange",
  onDark: "text-white/75",
  inverse: "text-white",
};

type EyebrowProps = {
  tone?: keyof typeof EYEBROW_TONE;
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
};

/** Rótulo pequeno em caixa alta (11px é o mínimo legível). */
export function Eyebrow({ tone = "muted", size = "sm", className, children }: EyebrowProps) {
  return (
    <p
      className={cx(
        "m-0 font-black uppercase tracking-[0.14em]",
        size === "sm" ? "text-[11px]" : "text-xs",
        EYEBROW_TONE[tone],
        className
      )}
    >
      {children}
    </p>
  );
}

/* ---------- Button ---------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: LucideIcon;
  iconRight?: LucideIcon;
};

/** primary (laranja), ghost (papel) ou dark (verde-floresta). */
export function Button({ variant = "primary", size = "md", iconLeft: IconLeft, iconRight: IconRight, className, children, ...props }: ButtonProps) {
  return (
    <button type="button" className={buttonClass(variant, size, className)} {...props}>
      {IconLeft && <IconLeft size={size === "sm" ? 14 : 16} strokeWidth={2.6} aria-hidden="true" />}
      {children}
      {IconRight && <IconRight size={18} strokeWidth={2.6} aria-hidden="true" />}
    </button>
  );
}

export function SkipButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" iconLeft={FastForward} onClick={onClick} className="shrink-0">
      Pular
    </Button>
  );
}

/* ---------- Surface ---------- */

type SurfaceProps = {
  tone?: "light" | "dark";
  glow?: boolean;
  rootClassName?: string;
  className?: string;
  children: ReactNode;
};

/**
 * `light`: papel branco com borda e sombra dura (o Panel do Dojô).
 * `dark`: moldura verde-floresta com borda de madeira e folhas ao fundo (os palcos do Dojô).
 */
export function Surface({ tone = "light", glow = false, rootClassName, className, children }: SurfaceProps) {
  return (
    <div
      className={cx(
        "relative isolate overflow-hidden",
        tone === "dark"
          ? "rounded-[2rem] border-2 border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep text-white shadow-[0_8px_0_hsl(var(--journey-wood-deep)/.35)]"
          : "rounded-2xl border-2 border-journey-wood/15 bg-white/85 text-journey-ink shadow-[0_5px_0_hsl(var(--journey-wood)/.12)]",
        rootClassName
      )}
    >
      {tone === "dark" && <div aria-hidden className="journey-leaf-pattern absolute inset-0 -z-10 opacity-15" />}
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,hsl(var(--journey-orange)/0.28)_0%,transparent_70%)]"
        />
      )}
      <div className={cx("relative h-full", className)}>{children}</div>
    </div>
  );
}

/* ---------- SegmentedProgress ---------- */

type SegmentedProgressProps = {
  total: number;
  current: number;
  tone?: "onLight" | "onDark";
  /** Estilo de bolinhas (a atual vira uma pílula maior). */
  dots?: boolean;
  className?: string;
};

/** Progresso dentro da etapa (letras, palavras). Decorativo: o texto "N de M" fica ao lado. */
export function SegmentedProgress({ total, current, tone = "onLight", dots = false, className }: SegmentedProgressProps) {
  const onDark = tone === "onDark";
  const done = "bg-journey-orange";
  const active = onDark ? "bg-journey-gold" : "bg-journey-orange shadow-[0_0_0_3px_hsl(var(--journey-orange)/.2)]";
  const upcoming = onDark ? "bg-white/20" : "bg-journey-wood/15";

  return (
    <div aria-hidden="true" className={cx("flex gap-1.5", dots && "items-center justify-center", className)}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cx(
            "rounded-full transition-all duration-500",
            dots ? (i === current ? "h-2 w-7" : "h-2 w-2") : "h-2 flex-1",
            i < current ? done : i === current ? active : upcoming
          )}
        />
      ))}
    </div>
  );
}

/* ---------- IconBadge / ResultCard / ScoreTile ---------- */

export function IconBadge({ icon: Icon, size = "md", className }: { icon: LucideIcon; size?: "md" | "lg"; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        "grid place-items-center rounded-full border-2 border-journey-gold/60 bg-journey-orange text-white shadow-[0_5px_0_hsl(var(--journey-orange)/.45)]",
        size === "lg" ? "h-[104px] w-[104px]" : "h-12 w-12",
        className
      )}
    >
      <Icon size={size === "lg" ? 44 : 22} strokeWidth={2.4} />
    </div>
  );
}

type ResultCardProps = {
  icon: LucideIcon;
  jp: string;
  label: string;
  percent: number;
  caption: string;
};

/** Resultado de um exercício: medalha, frase em japonês, percentual e legenda. */
export function ResultCard({ icon, jp, label, percent, caption }: ResultCardProps) {
  return (
    <div className="motion-safe:animate-scale-in">
      <Surface tone="dark" glow className="flex flex-col items-center px-4 py-6 text-center">
        <IconBadge icon={icon} className="mb-3" />
        <Eyebrow tone="accent">
          <span lang="ja" className="font-jp">
            {jp}
          </span>{" "}
          · {label}
        </Eyebrow>
        <p className="mb-1.5 mt-2 font-display text-[48px] font-black leading-none tracking-tighter text-white">
          {percent}
          <span className="text-[0.55em] text-journey-orange">%</span>
        </p>
        <Eyebrow tone="onDark">{caption}</Eyebrow>
      </Surface>
    </div>
  );
}

/** Nota de uma etapa na tela de conclusão. */
export function ScoreTile({ jp, label, score }: { jp: string; label: string; score: number }) {
  return (
    <div className="rounded-2xl border-2 border-white/15 bg-black/30 px-4 py-4 text-center">
      <Eyebrow tone="accent">
        <span lang="ja" className="font-jp">
          {jp}
        </span>
      </Eyebrow>
      <p className="mb-0.5 mt-2 font-display text-[40px] font-black leading-none tracking-tighter text-white">
        {score}
        <span className="text-2xl text-journey-orange">%</span>
      </p>
      <Eyebrow tone="onDark" className="mt-1.5">
        {label}
      </Eyebrow>
    </div>
  );
}

/* ---------- Layout ---------- */

/** `animated: false` quando o próprio conteúdo já anima (a carta da Leitura entra a cada palavra). */
export function LessonStack({ className, animated = true, children }: { className?: string; animated?: boolean; children: ReactNode }) {
  return <div className={cx("flex flex-col gap-4 pb-6", animated && "motion-safe:animate-fade-in-up", className)}>{children}</div>;
}

/** Abertura de cada etapa. O título recebe o foco na troca de etapa (o leitor de tela anuncia). */
export function ExerciseHeader({
  eyebrow,
  title,
  description,
  headingRef,
}: {
  eyebrow: string;
  title: string;
  description: string;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="mb-5">
      <Eyebrow tone="primary">{eyebrow}</Eyebrow>
      <h2 ref={headingRef} tabIndex={-1} className="mb-1 mt-1.5 scroll-mt-40 font-display text-[28px] font-black leading-[1.05] tracking-[-0.03em] text-journey-ink outline-none">
        {title}
      </h2>
      <p className="m-0 text-sm font-semibold text-journey-ink/75">{description}</p>
    </div>
  );
}
