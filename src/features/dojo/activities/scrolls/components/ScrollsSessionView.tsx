import { RotateCcw, Undo2 } from "lucide-react";
import type { ScrollGrade, ScrollSession } from "../types";
import { Flashcard } from "./Flashcard";
import { GradeButtons } from "./GradeButtons";

interface ScrollsSessionViewProps {
  session: ScrollSession;
  reduceMotion: boolean;
  onFlip: () => void;
  onGrade: (grade: ScrollGrade) => void;
  onUndo: () => void;
  onFinish: () => void;
}

export function ScrollsSessionView({ session, reduceMotion, onFlip, onGrade, onUndo, onFinish }: ScrollsSessionViewProps) {
  const card = session.queue[0];
  if (!card) return null;

  const done = session.history.length;
  const total = done + session.queue.length;
  const progress = Math.round((done / total) * 100);

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border-2 border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep p-2.5 shadow-[0_8px_0_hsl(var(--journey-wood-deep)/.35)] sm:p-4">
      <div className="journey-leaf-pattern absolute inset-0 opacity-10" aria-hidden="true" />
      <div className="relative rounded-[1.5rem] bg-journey-sand p-4 sm:p-7">
        <div className="flex items-center justify-between gap-4 text-[11px] font-black uppercase tracking-[0.12em] text-journey-ink/75 sm:text-xs">
          <span>
            Pergaminho {done + 1} de {total}
          </span>
          <span>Esc encerra</span>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-journey-wood/10"
          role="progressbar"
          aria-label="Progresso da sessão"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="h-full rounded-full bg-journey-orange transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-5">
          {/* Uma carta por `key`: trocar de carta remonta em vez de desvirar animado (o verso da próxima não aparece). */}
          <Flashcard key={card.key} card={card} flipped={session.flipped} reduceMotion={reduceMotion} onFlip={onFlip} />
        </div>

        <p className="mt-3 text-center text-xs font-bold text-journey-ink/75">
          {session.flipped ? "Como foi? Use 1–3 ou toque numa nota." : "Toque na carta ou aperte Espaço para virar."}
        </p>

        <GradeButtons mode={session.mode} enabled={session.flipped} onGrade={onGrade} />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={done === 0}
            aria-keyshortcuts="Z"
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-journey-wood/15 bg-white/60 px-4 text-xs font-black text-journey-ink/80 transition hover:border-journey-orange/30 hover:text-journey-orange disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Undo2 size={15} aria-hidden="true" /> Desfazer (Z)
          </button>
          <button
            type="button"
            onClick={onFinish}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-journey-wood/15 bg-white/60 px-4 text-xs font-black text-journey-ink/80 transition hover:border-journey-orange/30 hover:text-journey-orange"
          >
            <RotateCcw size={15} aria-hidden="true" /> Encerrar sessão
          </button>
        </div>
      </div>
    </section>
  );
}
