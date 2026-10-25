import type { ButtonHTMLAttributes, ReactNode } from "react";
import { FastForward } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cx } from "./lessonKit";

/* ---------- Eyebrow ---------- */

const EYEBROW_TONE = {
  accent: "text-accent",
  muted: "text-muted-foreground",
  primary: "text-primary",
  onDark: "text-[hsl(var(--surface-foreground)/0.6)]",
  inverse: "text-[hsl(var(--surface-foreground))]",
};

type EyebrowProps = {
  tone?: keyof typeof EYEBROW_TONE;
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
};

/** Rótulo pequeno em caixa alta com letter-spacing largo. */
export function Eyebrow({ tone = "muted", size = "sm", className, children }: EyebrowProps) {
  return (
    <p
      className={cx(
        "m-0 font-extrabold uppercase tracking-[0.14em]",
        size === "sm" ? "text-[10px]" : "text-xs",
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
  variant?: "primary" | "ghost" | "dark";
  size?: "md" | "sm";
  iconLeft?: LucideIcon;
  iconRight?: LucideIcon;
};

const BUTTON_VARIANT = {
  primary:
    "bg-primary text-primary-foreground shadow-[0_12px_28px_hsl(var(--primary)/0.4)]",
  ghost: "border-[1.5px] border-border bg-transparent text-foreground",
  dark: "bg-[hsl(var(--surface))] text-[hsl(var(--surface-foreground))]",
};

const BUTTON_SIZE = {
  md: "w-full px-5 py-4 text-[15px]",
  sm: "px-3.5 py-2 text-xs",
};

/** Botão em pílula: primary (laranja), ghost (contorno) ou dark (verde-floresta). */
export function Button({
  variant = "primary",
  size = "md",
  iconLeft: IconLeft,
  iconRight: IconRight,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-extrabold tracking-tight transition-all active:scale-95 disabled:opacity-70",
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        className
      )}
      {...props}
    >
      {IconLeft && <IconLeft size={size === "sm" ? 14 : 16} strokeWidth={2.6} />}
      {children}
      {IconRight && <IconRight size={18} strokeWidth={2.6} />}
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

/** Card: `dark` (verde-floresta, com brilho laranja opcional) ou `light` (creme). */
export function Surface({ tone = "light", glow = false, rootClassName, className, children }: SurfaceProps) {
  return (
    <div
      className={cx(
        "relative overflow-hidden",
        tone === "dark"
          ? "rounded-[32px] border border-[hsl(var(--surface-foreground)/0.14)] bg-[hsl(var(--surface))] text-[hsl(var(--surface-foreground))] shadow-[0_18px_40px_hsl(var(--surface)/0.26)]"
          : "rounded-3xl border-[1.5px] border-border bg-card text-foreground shadow-[0_8px_22px_hsl(var(--surface)/0.07)]",
        rootClassName
      )}
    >
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.25)_0%,transparent_70%)]"
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
  /** Rótulo opcional abaixo de cada segmento. */
  labels?: string[];
  className?: string;
};

export function SegmentedProgress({
  total,
  current,
  tone = "onLight",
  dots = false,
  labels,
  className,
}: SegmentedProgressProps) {
  const onDark = tone === "onDark";
  const done = onDark ? "bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]" : "bg-[hsl(var(--surface))]";
  const active = onDark
    ? "bg-[hsl(var(--primary)/0.5)]"
    : "bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]";
  const upcoming = onDark ? "bg-[hsl(var(--surface-foreground)/0.15)]" : "bg-border";

  return (
    <div className={cx("flex gap-1.5", dots && "items-center justify-center", className)}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={cx("flex flex-col gap-1.5", !dots && "flex-1")}>
          <div
            className={cx(
              "rounded-full transition-all duration-500",
              dots ? (i === current ? "h-2 w-7" : "h-2 w-2") : "h-1.5 w-full",
              i < current ? done : i === current ? active : upcoming
            )}
          />
          {labels && (
            <Eyebrow tone={i <= current ? "inverse" : "onDark"} className="text-center">
              {labels[i]}
            </Eyebrow>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- IconBadge / ResultCard / ScoreTile ---------- */

export function IconBadge({
  icon: Icon,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <div
      className={cx(
        "grid place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_24px_hsl(var(--primary)/0.4)]",
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

/** Cartão de resultado de um exercício (ícone, kanji, rótulo, percentual). */
export function ResultCard({ icon, jp, label, percent, caption }: ResultCardProps) {
  return (
    <div className="animate-scale-in">
      <Surface tone="dark" glow className="flex flex-col items-center px-4 py-6 text-center">
        <IconBadge icon={icon} className="mb-3" />
        <Eyebrow tone="accent">
          {jp} · {label}
        </Eyebrow>
        <p className="mb-1.5 mt-2 text-[48px] font-extrabold leading-none tracking-tighter text-white">
          {percent}
          <span className="text-[0.55em] text-primary">%</span>
        </p>
        <Eyebrow tone="onDark">{caption}</Eyebrow>
      </Surface>
    </div>
  );
}

/** Mini cartão com a nota de uma etapa (tela de conclusão). */
export function ScoreTile({ jp, label, score }: { jp: string; label: string; score: number }) {
  return (
    <Surface tone="dark" className="px-4 py-4 text-center">
      <Eyebrow tone="accent">{jp}</Eyebrow>
      <p className="mb-0.5 mt-2 text-[40px] font-extrabold leading-none tracking-tighter text-white">
        {score}
        <span className="text-2xl text-primary">%</span>
      </p>
      <Eyebrow tone="onDark" className="mt-1.5">
        {label}
      </Eyebrow>
    </Surface>
  );
}

/* ---------- Layout ---------- */

export function LessonStack({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("flex animate-fade-in-up flex-col gap-4 px-5 pb-6", className)}>{children}</div>
  );
}

export function ExerciseHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 px-5">
      <Eyebrow tone="primary">{eyebrow}</Eyebrow>
      <h3 className="mb-1 mt-1.5 text-[28px] font-extrabold leading-[1.05] tracking-tight">{title}</h3>
      <p className="m-0 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}