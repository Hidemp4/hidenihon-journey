import { useId } from "react";
import { ArrowRight, BookMarked, BookOpen, Check, ChevronRight, Lock, Target, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { lessonGlyph, type LessonState, type TrailLesson, type TrailSummary } from "./lessonTrail";

const LESSON_STEPS: ReadonlyArray<{ label: string; Icon: LucideIcon }> = [
  { label: "Introdução", Icon: BookOpen },
  { label: "Identificação", Icon: Target },
  { label: "Leitura", Icon: BookMarked },
];

const STATE_BADGES: Record<LessonState, string> = {
  completed: "border-journey-leaf bg-journey-leaf/10 text-journey-ink",
  next: "border-journey-forest-deep bg-journey-forest-deep text-journey-gold",
  available: "border-journey-wood/15 bg-journey-sand text-journey-ink",
  locked: "border-dashed border-journey-wood/40 bg-transparent text-journey-wood",
};

function stateText(lesson: TrailLesson) {
  switch (lesson.state) {
    case "completed":
      return `Concluída · ${lesson.score ?? 0}%`;
    case "next":
      return "Próxima";
    case "available":
      return "Disponível";
    case "locked":
      return "Bloqueada · conclua a anterior";
  }
}

const lessonNumber = (index: number) => `Lição ${String(index + 1).padStart(2, "0")}`;

// ---- seções (Hiragana / Katakana / Kanji) -----------------------------------

export interface SectionOption {
  id: string;
  label: string;
  glyph: string;
  summary: TrailSummary;
}

export function SectionSwitcher({ sections, active, onSelect }: { sections: readonly SectionOption[]; active: string; onSelect: (id: string) => void }) {
  return (
    <div role="group" aria-label="Seção do módulo" className="grid grid-cols-3 gap-2 sm:gap-3">
      {sections.map((section) => {
        const isActive = section.id === active;
        return (
          <button
            key={section.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(section.id)}
            className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3 text-center outline-none transition focus-visible:ring-4 focus-visible:ring-journey-orange/40 active:translate-y-0.5 active:shadow-none ${
              isActive
                ? "border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep text-white shadow-[0_4px_0_hsl(var(--journey-wood-deep)/.45)]"
                : "border-journey-wood/15 bg-white/85 text-journey-ink shadow-[0_4px_0_hsl(var(--journey-wood)/.12)] hover:border-journey-orange/50"
            }`}
          >
            <span aria-hidden="true" lang="ja" className={`font-jp text-3xl font-black leading-none ${isActive ? "text-journey-gold" : "text-journey-wood"}`}>
              {section.glyph}
            </span>
            <span className="text-sm font-black">{section.label}</span>
            <span className={`text-[11px] font-bold ${isActive ? "text-white/80" : "text-journey-ink/70"}`}>
              {section.summary.completed}/{section.summary.total} lições
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---- cabeçalho da seção --------------------------------------------------------

export function TrailHeading({ title, jp, details, summary }: { title: string; jp?: string; details: string; summary: TrailSummary }) {
  const labelId = useId();
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2 id={labelId} className="flex flex-wrap items-baseline gap-x-2 font-display text-2xl font-black tracking-[-0.03em] text-journey-ink">
          {title}
          {jp && (
            <span lang="ja" className="font-jp text-base font-bold text-journey-wood">
              {jp}
            </span>
          )}
        </h2>
        <p className="text-xs font-bold text-journey-ink/75">{details}</p>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-journey-wood/10"
          role="progressbar"
          aria-labelledby={labelId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={summary.percent}
          aria-valuetext={`${summary.completed} de ${summary.total} lições concluídas`}
        >
          <div className="h-full rounded-full bg-journey-orange transition-[width] duration-500" style={{ width: `${summary.percent}%` }} />
        </div>
        <span className="text-xs font-black text-journey-ink">
          {summary.completed}/{summary.total}
        </span>
      </div>
    </div>
  );
}

// ---- próxima lição (destaque) ------------------------------------------------

export function NextLessonPanel({ lesson, href, details, allDone }: { lesson: TrailLesson | null; href: string | null; details: string; allDone: boolean }) {
  return (
    <section
      aria-label={lesson ? "Próxima lição" : "Seção concluída"}
      className="relative isolate overflow-hidden rounded-[2rem] border-2 border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep p-2.5 shadow-[0_8px_0_hsl(var(--journey-wood-deep)/.35)] sm:p-3"
    >
      <div className="journey-leaf-pattern absolute inset-0 opacity-10" aria-hidden="true" />
      <div className="relative rounded-[1.5rem] bg-journey-sand p-5 sm:p-6">
        {lesson && href ? (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-journey-orange">Próxima lição · {lessonNumber(lesson.index)}</p>
              <h3 className="mt-2 font-display text-xl font-black leading-tight tracking-[-0.02em] text-journey-ink">{lesson.group.title}</h3>
              <p lang="ja" aria-hidden="true" className="mt-2 truncate font-jp text-2xl font-black tracking-[0.12em] text-journey-wood">
                {lesson.group.chars.slice(0, 5).map((char) => char.char).join(" ")}
              </p>
              <p className="mt-1 text-xs font-bold text-journey-ink/75">{details}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Etapas da lição">
                {LESSON_STEPS.map(({ label, Icon }) => (
                  <li key={label} className="inline-flex items-center gap-1 rounded-full border-2 border-journey-wood/15 bg-white px-2.5 py-1 text-[11px] font-black text-journey-ink">
                    <Icon size={13} aria-hidden="true" /> {label}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to={href}
              className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-journey-gold/60 bg-journey-orange px-6 text-sm font-black text-white shadow-[0_5px_0_hsl(var(--journey-orange)/.45)] outline-none transition hover:bg-journey-orange-hover focus-visible:ring-4 focus-visible:ring-journey-orange/40 active:translate-y-0.5 active:shadow-none motion-safe:hover:-translate-y-0.5"
            >
              Começar lição <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="text-center">
            <p aria-hidden="true" className="font-jp text-4xl font-black text-journey-wood">
              {allDone ? "完" : "鍵"}
            </p>
            <h3 className="mt-2 font-display text-xl font-black text-journey-ink">{allDone ? "Seção concluída!" : "Nenhuma lição liberada"}</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm font-semibold text-journey-ink/75">
              {allDone ? "Revise qualquer lição abaixo para subir a nota, ou treine no Dojô." : "Conclua as lições anteriores para liberar as próximas."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

// ---- trilha de lições ------------------------------------------------------------

function LessonEmblem({ glyph, state }: { glyph: string; state: LessonState }) {
  const ring = state === "completed" ? "border-journey-leaf" : state === "next" ? "border-journey-orange" : "border-[hsl(var(--journey-wood-deep))]";
  return (
    <div aria-hidden="true" className="relative shrink-0">
      <div
        className={`relative grid h-16 w-16 place-items-center overflow-hidden rounded-xl border-[3px] ${ring} ${
          state === "locked" ? "bg-journey-wood/30" : "bg-journey-forest-deep"
        } shadow-[0_4px_0_hsl(var(--journey-wood-deep)/.35)]`}
      >
        <div className="journey-leaf-pattern absolute inset-0 opacity-25" />
        <span lang="ja" className={`relative font-jp text-3xl font-black leading-none ${state === "locked" ? "text-journey-sand" : "text-journey-gold"}`}>
          {glyph}
        </span>
      </div>
      {state === "completed" && (
        <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-journey-leaf text-white">
          <Check size={13} strokeWidth={3.5} />
        </span>
      )}
    </div>
  );
}

function LessonCard({ lesson, glyph, details, href }: { lesson: TrailLesson; glyph: string; details: string; href: string }) {
  const baseId = useId();
  const locked = lesson.state === "locked";

  const content = (
    <>
      <LessonEmblem glyph={glyph} state={lesson.state} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-journey-wood">{lessonNumber(lesson.index)}</p>
        <h3 id={`${baseId}-title`} className="mt-0.5 font-display text-base font-black leading-tight text-journey-ink sm:text-lg">
          {lesson.group.title}
        </h3>
        <p className="mt-1 text-xs font-semibold text-journey-ink/75">{details}</p>
        <p id={`${baseId}-state`} className={`mt-2 inline-flex rounded-full border-2 px-2.5 py-0.5 text-[11px] font-black ${STATE_BADGES[lesson.state]}`}>
          {stateText(lesson)}
        </p>
      </div>
      {locked ? (
        <Lock size={18} strokeWidth={2.4} aria-hidden="true" className="shrink-0 text-journey-wood" />
      ) : (
        <ChevronRight size={22} strokeWidth={2.6} aria-hidden="true" className="shrink-0 text-journey-orange" />
      )}
    </>
  );

  const shared = "flex min-h-24 items-center gap-4 rounded-2xl border-2 p-4 outline-none focus-visible:ring-4 focus-visible:ring-journey-orange/40";

  if (locked) {
    // Focável de propósito (igual aos cards "em breve" do Dojô): quem usa teclado também vê o que vem depois.
    return (
      <div
        role="link"
        aria-disabled="true"
        tabIndex={0}
        aria-labelledby={`${baseId}-title`}
        aria-describedby={`${baseId}-state`}
        className={`${shared} cursor-not-allowed border-dashed border-journey-wood/25 bg-journey-sand/60`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to={href}
      aria-labelledby={`${baseId}-title`}
      aria-describedby={`${baseId}-state`}
      className={`${shared} group transition hover:bg-white active:shadow-none motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0.5 ${
        lesson.state === "next"
          ? "border-journey-orange/60 bg-white shadow-[0_5px_0_hsl(var(--journey-orange)/.25)]"
          : "border-journey-wood/15 bg-white/85 shadow-[0_5px_0_hsl(var(--journey-wood)/.12)] hover:border-journey-orange/50"
      }`}
    >
      {content}
    </Link>
  );
}

interface LessonTrailProps {
  trail: readonly TrailLesson[];
  /** Caractere do emblema quando a lição não tem (ex.: o emoji do módulo). */
  fallbackGlyph: string;
  getDetails: (lesson: TrailLesson) => string;
  getHref: (lesson: TrailLesson) => string;
}

/** Lições em fila, ligadas por um traço (a trilha). */
export function LessonTrail({ trail, fallbackGlyph, getDetails, getHref }: LessonTrailProps) {
  return (
    <ol aria-label="Lições" className="flex flex-col gap-3">
      {trail.map((lesson) => (
        <li
          key={lesson.scopedId}
          // O traço sai do centro do emblema (p-4 + metade de 64px + borda) e liga ao card de baixo.
          className="relative after:absolute after:-bottom-3 after:left-[3.15rem] after:h-3 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-journey-wood/25 last:after:hidden"
        >
          <LessonCard lesson={lesson} glyph={lessonGlyph(lesson.group, fallbackGlyph)} details={getDetails(lesson)} href={getHref(lesson)} />
        </li>
      ))}
    </ol>
  );
}
