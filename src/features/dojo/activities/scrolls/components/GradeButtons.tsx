import { GRADE_OPTIONS } from "../constants";
import { describeReturn, intervalDays } from "../scheduler";
import type { ScrollGrade, ScrollMode } from "../types";

const KEY_TONES: Record<ScrollGrade, string> = {
  again: "bg-journey-wood text-white",
  good: "bg-journey-leaf text-white",
  easy: "bg-journey-forest-deep text-journey-gold",
};

interface GradeButtonsProps {
  mode: ScrollMode;
  enabled: boolean;
  onGrade: (grade: ScrollGrade) => void;
}

/** Mostra quando a carta volta antes de dar a nota (o treino livre não agenda). */
function preview(mode: ScrollMode, grade: ScrollGrade) {
  if (mode === "free") return "sem agenda";
  return `volta ${describeReturn(intervalDays(grade))}`;
}

export function GradeButtons({ mode, enabled, onGrade }: GradeButtonsProps) {
  return (
    <div role="group" aria-label="Como foi?" className="mt-5 grid grid-cols-3 gap-2">
      {GRADE_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          disabled={!enabled}
          onClick={() => onGrade(option.id)}
          aria-keyshortcuts={option.key}
          className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-journey-wood/15 bg-white px-2 py-2 text-center text-journey-ink shadow-[0_4px_0_hsl(var(--journey-wood)/.12)] transition hover:border-journey-orange/40 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          <span className="flex items-center gap-2 text-sm font-black">
            {/* No celular não há teclado: a tecla só aparece a partir do sm. */}
            <kbd aria-hidden="true" className={`hidden h-6 w-6 place-items-center rounded-md text-xs font-black sm:grid ${KEY_TONES[option.id]}`}>
              {option.key}
            </kbd>
            {option.label}
          </span>
          <span className="text-[11px] font-bold leading-tight text-journey-ink/70">{preview(mode, option.id)}</span>
        </button>
      ))}
    </div>
  );
}
