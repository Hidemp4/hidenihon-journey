import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { ArrowLeft, ArrowRight, Eraser, Play, SkipForward, Undo2 } from "lucide-react";
import { SELF_GRADE_OPTIONS } from "../constants";
import { strokeTimeline, timelineEnd } from "../drawing";
import { traceFeedbackMessage } from "../messages";
import { suggestGrade } from "../scoring";
import type { BrushCard, BrushSession, DrawnStroke, SelfGrade } from "../types";
import { GlyphAnimation, GlyphGuide, GlyphNumbered, GlyphReveal, PracticeGrid } from "./GlyphLayers";
import { InkCanvas } from "./InkCanvas";

import { answerOf, formatKunReading, scriptLabel } from "@/features/dojo/shared/content";
import type { StudyItem } from "@/features/dojo/shared/studyItem";
/** Folga depois do último traço antes de trocar a animação pelo guia. */
const ANIMATION_TAIL_MS = 400;

const toolClass =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-journey-wood/15 bg-white px-3 text-xs font-black text-journey-ink transition hover:border-journey-orange/40 disabled:cursor-not-allowed disabled:opacity-50";
const primaryClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-journey-gold/60 bg-journey-orange px-5 text-sm font-black text-white shadow-[0_5px_0_hsl(var(--journey-orange)/.45)] transition hover:bg-journey-orange-hover active:translate-y-0.5 active:shadow-none";

/** Como chamar o item na tela: "Kana 2 de 5" / "Kanji 2 de 5". */
function unitOf(item: StudyItem) {
  return item.kind === "kanji" ? "Kanji" : "Kana";
}

/** Leitura que ajuda a lembrar o kanji de memória: a 1ª kun'yomi (ou on'yomi). */
function readingHint(item: StudyItem) {
  if (item.kind !== "kanji") return "";
  const kun = item.kunyomi[0];
  return kun ? formatKunReading(kun) : (item.onyomi[0] ?? "");
}

function Prompt({ card, mode, revealed, headingRef }: { card: BrushCard; mode: BrushSession["mode"]; revealed: boolean; headingRef: Ref<HTMLHeadingElement> }) {
  const { item } = card;
  const strokes = card.glyph.strokes.length;
  const showKana = mode !== "recall" || revealed;
  const answer = answerOf(item);
  const kanji = item.kind === "kanji";

  return (
    <h2 ref={headingRef} tabIndex={-1} className="flex flex-col items-center rounded-xl text-center outline-none focus-visible:ring-4 focus-visible:ring-journey-orange/40">
      <span className="sr-only">{mode === "recall" ? `Escreva ${answer} ${scriptLabel(item)}` : `Escreva ${item.char}, ${answer}`}.</span>
      <span aria-hidden="true" className="flex items-baseline gap-3">
        {showKana && (
          <span lang="ja" className="font-jp text-5xl font-black leading-none text-journey-ink">
            {item.char}
          </span>
        )}
        <span
          className={`font-display font-black tracking-[-0.03em] ${showKana ? "text-2xl text-journey-orange" : kanji ? "text-4xl text-journey-ink" : "text-5xl text-journey-ink"}`}
        >
          {answer}
        </span>
      </span>
      <span aria-hidden="true" className="mt-1.5 text-xs font-bold text-journey-ink/75">
        {kanji && (
          <span lang="ja" className="mr-1 font-jp">
            {readingHint(item)} ·
          </span>
        )}
        {mode === "recall" ? `${scriptLabel(item)} · de memória` : `${strokes} ${strokes === 1 ? "traço" : "traços"}`}
      </span>
    </h2>
  );
}

interface CardViewProps {
  session: BrushSession;
  card: BrushCard;
  reduceMotion: boolean;
  hintId: string;
  onStroke: (cardKey: string, points: DrawnStroke) => void;
  onUndo: () => void;
  onClear: () => void;
  onCheck: () => void;
  onGrade: (grade: SelfGrade) => void;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

/** Um caractere. Montado com `key` por carta: animação, foco e canvas começam do zero a cada um. */
function CardView({ session, card, reduceMotion, hintId, onStroke, onUndo, onClear, onCheck, onGrade, onNext, onPrev, onSkip }: CardViewProps) {
  const { mode, phase } = session;
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const actionRef = useRef<HTMLButtonElement | null>(null);
  const [run, setRun] = useState(0);
  // Traçar e Estudar abrem com a animação da ordem (com movimento reduzido, os números já estão no guia).
  const [animating, setAnimating] = useState(!reduceMotion && mode !== "recall");
  const timeline = useMemo(() => strokeTimeline(card.glyph.strokes.map((stroke) => stroke.length)), [card.glyph]);
  const checked = phase === "checked";
  const suggestion = mode === "recall" && checked && session.score ? suggestGrade(session.score) : null;
  const rejected = session.feedback != null && session.feedback.verdict.kind !== "ok";

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  // Conferido: o foco vai para a ação seguinte (Próximo, ou a autoavaliação sugerida).
  useEffect(() => {
    if (checked) actionRef.current?.focus({ preventScroll: true });
  }, [checked]);

  useEffect(() => {
    if (!animating) return;
    const timeoutId = window.setTimeout(() => setAnimating(false), timelineEnd(timeline) + ANIMATION_TAIL_MS);
    return () => window.clearTimeout(timeoutId);
  }, [animating, run, timeline]);

  const replay = () => {
    setRun((value) => value + 1);
    setAnimating(true);
  };

  const canvasLabel =
    mode === "trace"
      ? `Quadro de escrita: ${session.strokes.length} de ${card.glyph.strokes.length} traços feitos`
      : `Quadro de escrita: ${session.strokes.length} ${session.strokes.length === 1 ? "traço desenhado" : "traços desenhados"}`;

  let tools: ReactNode;
  if (mode === "study") {
    tools = (
      <div className={`grid gap-2 ${reduceMotion ? "grid-cols-2" : "grid-cols-3"}`}>
        <button type="button" className={toolClass} onClick={onPrev} disabled={session.index === 0} aria-keyshortcuts="ArrowLeft">
          <ArrowLeft size={15} aria-hidden="true" /> Anterior
        </button>
        {!reduceMotion && (
          <button type="button" className={toolClass} onClick={replay}>
            <Play size={15} aria-hidden="true" /> Repetir
          </button>
        )}
        <button type="button" className={toolClass} onClick={onNext} aria-keyshortcuts="ArrowRight Enter">
          Próximo <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>
    );
  } else if (!checked) {
    tools = (
      <>
        <div className={`grid gap-2 ${mode === "trace" && !reduceMotion ? "grid-cols-3" : "grid-cols-2"}`}>
          <button type="button" className={toolClass} onClick={onUndo} disabled={session.strokes.length === 0} aria-keyshortcuts="Z Control+Z">
            <Undo2 size={15} aria-hidden="true" /> Desfazer
          </button>
          <button type="button" className={toolClass} onClick={onClear} disabled={session.strokes.length === 0}>
            <Eraser size={15} aria-hidden="true" /> Limpar
          </button>
          {mode === "trace" && !reduceMotion && (
            <button type="button" className={toolClass} onClick={replay}>
              <Play size={15} aria-hidden="true" /> Ver ordem
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {mode === "recall" && (
            <button type="button" className={`${primaryClass} flex-1`} onClick={onCheck} aria-keyshortcuts="Enter">
              Conferir (Enter)
            </button>
          )}
          <button type="button" className={`${toolClass} sm:flex-none ${mode === "trace" ? "w-full" : ""}`} onClick={onSkip}>
            <SkipForward size={15} aria-hidden="true" /> Pular {unitOf(card.item).toLowerCase()}
          </button>
        </div>
      </>
    );
  } else if (mode === "trace") {
    tools = (
      <div className="text-center">
        <p className="text-sm font-black text-journey-ink">
          Nota {session.score?.score ?? 0} · {session.corrections === 0 ? "sem correções" : `${session.corrections} ${session.corrections === 1 ? "correção" : "correções"}`}
        </p>
        <button ref={actionRef} type="button" className={`${primaryClass} mt-3 w-full`} onClick={onNext} aria-keyshortcuts="Enter">
          Próximo (Enter)
        </button>
      </div>
    );
  } else {
    tools = (
      <div>
        <p className="text-center text-sm font-black text-journey-ink">
          Nota automática {session.score?.score ?? 0} de 100 · {session.score?.strokeCount ?? 0} de {card.glyph.strokes.length} traços
        </p>
        <p className="mt-1 text-center text-xs font-semibold text-journey-ink/75">Compare com o modelo em laranja e diga como foi.</p>
        <div role="group" aria-label="Como foi?" className="mt-3 grid grid-cols-3 gap-2">
          {SELF_GRADE_OPTIONS.map((option) => (
            <button
              key={option.id}
              ref={option.id === suggestion ? actionRef : undefined}
              type="button"
              onClick={() => onGrade(option.id)}
              aria-keyshortcuts={option.key}
              aria-describedby={option.id === suggestion ? `${hintId}-suggested` : undefined}
              className={`relative flex min-h-14 flex-col items-center justify-center rounded-2xl border-2 px-2 text-sm font-black transition ${
                option.id === suggestion ? "border-journey-orange bg-journey-orange text-white" : "border-journey-wood/15 bg-white text-journey-ink hover:border-journey-orange/40"
              }`}
            >
              <span>{option.label}</span>
              <kbd aria-hidden="true" className="text-[11px] font-black opacity-90">
                {option.key}
              </kbd>
            </button>
          ))}
        </div>
        <p id={`${hintId}-suggested`} className="mt-2 text-center text-[11px] font-semibold text-journey-ink/75">
          Sugestão pela nota: {SELF_GRADE_OPTIONS.find(({ id }) => id === suggestion)?.label}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-4">
        <Prompt card={card} mode={mode} revealed={checked} headingRef={headingRef} />
      </div>

      <div className="relative mx-auto mt-4 aspect-square w-full max-w-[22rem] overflow-hidden rounded-[1.5rem] border-2 border-journey-wood/20 bg-white shadow-[0_5px_0_hsl(var(--journey-wood)/.12)]">
        <PracticeGrid />
        {mode === "trace" && <GlyphGuide glyph={card.glyph} next={animating || checked ? null : session.strokes.length} numbered={reduceMotion} />}
        {mode === "study" && (reduceMotion ? <GlyphNumbered glyph={card.glyph} /> : <GlyphAnimation key={run} glyph={card.glyph} />)}
        {mode !== "study" && (
          <InkCanvas strokes={session.strokes} enabled={!checked} label={canvasLabel} describedBy={hintId} onStroke={(points) => onStroke(card.key, points)} />
        )}
        {mode === "trace" && animating && <GlyphAnimation key={run} glyph={card.glyph} />}
        {mode === "recall" && checked && <GlyphReveal glyph={card.glyph} />}
      </div>

      {mode === "trace" && !checked && (
        // Visível só para quem enxerga: o leitor de tela já recebe o mesmo texto pela região live.
        <p
          aria-hidden="true"
          className={`mx-auto mt-3 max-w-[22rem] rounded-xl px-3 py-2 text-center text-xs font-bold ${rejected ? "bg-white text-journey-ink" : "text-journey-ink/80"}`}
        >
          {rejected ? traceFeedbackMessage(card, session.feedback) : `Traço ${session.strokes.length + 1} de ${card.glyph.strokes.length}: siga o laranja, a partir do ponto.`}
        </p>
      )}

      {mode !== "study" && (
        <p id={hintId} className="mt-2 text-center text-[11px] font-semibold text-journey-ink/75">
          Desenhe com o dedo, a caneta ou o mouse · Z desfaz
          {mode === "recall" ? " · sem mouse, Conferir mostra o modelo" : ""}
        </p>
      )}

      <div className="mt-4">{tools}</div>
    </>
  );
}

function liveMessage(session: BrushSession, card: BrushCard): string {
  if (session.mode === "trace") return traceFeedbackMessage(card, session.feedback);
  if (session.mode === "recall") {
    if (session.phase !== "checked" || !session.score) return "";
    return `Modelo à mostra: ${card.item.char}. Nota automática ${session.score.score} de 100, ${session.score.strokeCount} de ${card.glyph.strokes.length} traços.`;
  }
  return `${unitOf(card.item)} ${session.index + 1} de ${session.cards.length}: ${card.item.char}, ${answerOf(card.item)}, ${card.glyph.strokes.length} traços.`;
}

interface BrushSessionViewProps extends Omit<CardViewProps, "card" | "hintId"> {
  card: BrushCard;
  onFinish: () => void;
}

export function BrushSessionView(props: BrushSessionViewProps) {
  const { session, card, onFinish } = props;
  const hintId = useId();
  const progress = Math.round((session.index / session.cards.length) * 100);

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border-2 border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep p-2.5 shadow-[0_8px_0_hsl(var(--journey-wood-deep)/.35)] sm:p-4">
      <div className="journey-leaf-pattern absolute inset-0 opacity-10" aria-hidden="true" />
      <div className="relative rounded-[1.5rem] bg-journey-sand p-4 sm:p-7">
        <div className="flex items-center justify-between gap-4 text-[11px] font-black uppercase tracking-[0.12em] text-journey-ink/75 sm:text-xs">
          <span>
            {unitOf(card.item)} {session.index + 1} de {session.cards.length}
          </span>
          <button type="button" onClick={onFinish} className="min-h-11 rounded-full px-2 uppercase tracking-[0.12em] hover:text-journey-orange">
            Encerrar (Esc)
          </button>
        </div>
        <div
          className="mt-1 h-2 overflow-hidden rounded-full bg-journey-wood/10"
          role="progressbar"
          aria-label="Progresso da sessão"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="h-full rounded-full bg-journey-orange transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>

        <CardView key={card.key} {...props} hintId={hintId} />

        {/* Região live sempre montada (fora do kana, que remonta a cada carta): só anuncia se já existir antes. */}
        <p className="sr-only" role="status" aria-live="polite">
          {liveMessage(session, card)}
        </p>
      </div>
    </section>
  );
}
