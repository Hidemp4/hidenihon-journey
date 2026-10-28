import { useId, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Volume2, VolumeX } from "lucide-react";

const optionBase = "min-h-11 rounded-xl border px-3 py-2 text-xs font-extrabold transition active:scale-[0.98]";

/** Painel padrão da página: borda grossa e sombra "dura" de baixo, no clima de interface de jogo. */
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border-2 border-journey-wood/15 bg-white/80 p-5 shadow-[0_5px_0_hsl(var(--journey-wood)/.12)] sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

/** Peça do placar (HUD) sobre a arena. */
export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border-2 border-white/20 bg-black/40 px-3 py-2 backdrop-blur-[2px] sm:min-w-24">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/75">{label}</p>
      <p className="mt-1 truncate font-display text-lg font-black text-white sm:text-xl">{value}</p>
    </div>
  );
}

export function SectionTitle({ title, eyebrow, icon }: { title: string; eyebrow?: string; icon?: ReactNode }) {
  return (
    <div className="mb-5">
      {eyebrow && <p className="text-[10px] font-black uppercase tracking-[0.18em] text-journey-orange">{eyebrow}</p>}
      <h2 className="mt-1.5 flex items-center gap-2 font-display text-lg font-black tracking-[-0.025em] text-journey-ink">
        {icon}
        {title}
      </h2>
    </div>
  );
}

export function SettingGroup({ label, children }: { label: string; children: ReactNode }) {
  const labelId = useId();

  return (
    <div role="group" aria-labelledby={labelId} className="mt-5 first:mt-0">
      <p id={labelId} className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-journey-wood/75">
        {label}
      </p>
      {children}
    </div>
  );
}

export function OptionButton({
  active,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...props}
      className={`${optionBase} ${
        active
          ? "border-journey-forest-deep bg-journey-forest-deep text-white shadow-sm"
          : "border-journey-wood/10 bg-white/65 text-journey-ink/70 hover:border-journey-orange/30 hover:bg-white hover:text-journey-ink"
      } ${className}`}
    />
  );
}

export function MetricCard({
  label,
  value,
  dark = false,
  icon,
}: {
  label: string;
  value: string;
  dark?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div
      className={
        dark
          ? "min-w-0 rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-3 sm:min-w-28 sm:px-4"
          : "rounded-2xl border border-journey-wood/10 bg-white/75 p-3"
      }
    >
      <p
        className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] ${
          dark ? "text-white/70" : "text-journey-ink/65"
        }`}
      >
        {icon}
        {label}
      </p>
      <p className={`mt-1.5 truncate text-base font-black sm:text-lg ${dark ? "text-white" : "text-journey-ink"}`}>{value}</p>
    </div>
  );
}

export function AudioToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-journey-forest-deep/70 text-white transition hover:border-journey-orange/50 hover:text-journey-orange"
      aria-label={enabled ? "Desativar áudio" : "Ativar áudio"}
      aria-pressed={enabled}
    >
      {enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );
}
