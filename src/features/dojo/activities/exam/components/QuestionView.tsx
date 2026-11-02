import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Clock3, Heart, X } from "lucide-react";
import { CountdownTrack } from "@/features/dojo/shared/components/CountdownBar";
import { useCountdownBar } from "@/features/dojo/shared/useCountdownBar";
import { SURVIVAL_LIVES } from "../constants";
import { isRunFinished } from "../examReducer";
import type { ExamAnswer, ExamRun, QuizQuestion } from "../types";

import { answerOf, answerText as itemAnswerText, scriptLabel } from "@/features/dojo/shared/content";

/** Barra do Relâmpago: o HUD do modo Avançado da Arena. Montada com `key` por questão (começa cheia). */
function LightningTimer({ question, durationMs, onExpire }: { question: QuizQuestion; durationMs: number; onExpire: (id: string) => void }) {
  const [startedAt] = useState(() => performance.now());
  const { barRef, seconds, level } = useCountdownBar(durationMs, startedAt, onExpire, question.id);

  return (
    <div className="mt-4">
      <p className="flex items-center justify-end gap-1.5 text-xs font-black text-journey-ink/80">
        <Clock3 size={14} aria-hidden="true" /> {seconds}s
      </p>
      <CountdownTrack barRef={barRef} level={level} className="mt-1.5" />
    </div>
  );
}

/**
 * Respondida: a barra para e some, mas o espaço dela fica (mesma altura: texto + trilho vazio),
 * para nada abaixo pular para cima no meio do toque.
 */
function TimerPlaceholder() {
  return (
    <div className="mt-4" aria-hidden="true">
      <p className="invisible text-xs font-black">0s</p>
      <div className="mt-1.5 h-2.5 rounded-full bg-journey-wood/10" />
    </div>
  );
}

function Lives({ lives }: { lives: number }) {
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`Vidas: ${lives} de ${SURVIVAL_LIVES}`}>
      {Array.from({ length: SURVIVAL_LIVES }, (_, index) => (
        <Heart
          key={index}
          size={16}
          aria-hidden="true"
          className={index < lives ? "text-journey-orange" : "text-journey-wood/40"}
          fill={index < lives ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

function answerText(question: QuizQuestion) {
  return itemAnswerText(question.item);
}

function feedbackMessage(answer: ExamAnswer | null) {
  if (!answer) return "";
  if (answer.outcome === "correct") return "Correto!";
  const prefix = answer.outcome === "timeout" ? "Tempo esgotado." : "Errou.";
  return `${prefix} A resposta era ${answerText(answer.question)}.`;
}

interface QuestionViewProps {
  run: ExamRun;
  answered: boolean;
  onAnswer: (index: number) => void;
  onTimeout: (questionId: string) => void;
  onNext: () => void;
  onFinish: () => void;
}

export function QuestionView({ run, answered, onAnswer, onTimeout, onNext, onFinish }: QuestionViewProps) {
  const { question } = run;
  const promptRef = useRef<HTMLHeadingElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const answer = answered ? run.answers[run.answers.length - 1] : null;
  const number = run.answers.length + (answered ? 0 : 1);
  const kanaPrompt = question.direction === "kana-to-romaji";
  const kanji = question.item.kind === "kanji";
  const finished = answered && isRunFinished(run);
  const progress = run.questionCount ? Math.round((run.answers.length / run.questionCount) * 100) : null;

  // Pergunta nova: o foco vai para o enunciado (o leitor de tela lê); respondida: vai para "Próxima".
  useEffect(() => {
    (answered ? nextRef.current : promptRef.current)?.focus({ preventScroll: true });
  }, [answered, question.id]);

  const slotTone = !answer
    ? "border-journey-wood/15 bg-white/70"
    : answer.outcome === "correct"
      ? "border-journey-leaf bg-journey-leaf/15"
      : "border-journey-wood/40 bg-journey-wood/10";

  /*
   * Layout fixo: responder não muda o tamanho de nada. A área de resultado e o "Próxima" existem
   * desde o início (só trocam texto/cor), a barra do Relâmpago deixa o espaço reservado, e o
   * "Encerrar" fica no topo, longe das alternativas. Antes o resultado entrava entre as alternativas
   * e o "Encerrar exame", e ao avançar tudo subia: o toque seguinte caía no "Encerrar".
   */
  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border-2 border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep p-2.5 shadow-[0_8px_0_hsl(var(--journey-wood-deep)/.35)] sm:p-4">
      <div className="journey-leaf-pattern absolute inset-0 opacity-10" aria-hidden="true" />
      <div className="relative rounded-[1.5rem] bg-journey-sand p-4 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-black uppercase tracking-[0.12em] text-journey-ink/75 sm:text-xs">
            <span>
              Pergunta {number}
              {run.questionCount ? ` de ${run.questionCount}` : ""}
            </span>
            {run.lives != null && <Lives lives={run.lives} />}
          </div>
          <button
            type="button"
            onClick={onFinish}
            aria-keyshortcuts="Escape"
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-journey-wood/15 bg-white/70 px-3.5 text-xs font-black text-journey-ink/80 transition hover:border-journey-orange/40 hover:text-journey-orange"
          >
            <X size={14} strokeWidth={3} aria-hidden="true" />
            Encerrar<span className="sr-only"> exame</span>
            <span className="hidden sm:inline">(Esc)</span>
          </button>
        </div>

        {progress != null && (
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-journey-wood/10"
            role="progressbar"
            aria-label="Progresso do exame"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="h-full rounded-full bg-journey-orange transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}

        {run.timeLimitMs != null &&
          (answered ? (
            <TimerPlaceholder />
          ) : (
            <LightningTimer key={question.id} question={question} durationMs={run.timeLimitMs} onExpire={onTimeout} />
          ))}

        <h2
          ref={promptRef}
          tabIndex={-1}
          className="mt-4 flex min-h-44 flex-col items-center justify-center rounded-[1.75rem] border-2 border-journey-wood/15 bg-white px-4 py-5 text-center shadow-[0_5px_0_hsl(var(--journey-wood)/.12)] outline-none focus-visible:ring-4 focus-visible:ring-journey-orange/40 sm:min-h-52 sm:py-6"
        >
          <span className="sr-only">Pergunta {number}: </span>
          {kanaPrompt ? (
            <span lang="ja" className="font-jp text-[6.5rem] font-black leading-none text-journey-ink sm:text-[8rem]">
              {question.item.char}
            </span>
          ) : (
            <>
              <span className={`font-display font-black tracking-[-0.04em] text-journey-ink ${kanji ? "text-5xl" : "text-6xl"}`}>{answerOf(question.item)}</span>
              <span className="mt-2 text-sm font-bold text-journey-ink/75">{scriptLabel(question.item)}</span>
            </>
          )}
          <span className="mt-4 text-xs font-bold text-journey-ink/70">{kanaPrompt ? (kanji ? "Qual é o significado?" : "Qual é o romaji?") : kanji ? "Qual é o kanji?" : "Qual é o kana?"}</span>
        </h2>

        <div role="group" aria-label="Alternativas" className="mt-4 grid grid-cols-2 gap-2">
          {question.options.map((option, index) => {
            const isCorrect = index === question.correctIndex;
            const isChosen = answer?.chosenIndex === index;
            const tone = !answered
              ? "border-journey-wood/15 bg-white text-journey-ink hover:border-journey-orange/40"
              : isCorrect
                ? "border-journey-leaf bg-journey-leaf text-white"
                : isChosen
                  ? "border-journey-wood bg-journey-wood text-white"
                  : "border-journey-wood/10 bg-white/60 text-journey-ink/70";

            return (
              <button
                key={option.itemId}
                type="button"
                disabled={answered}
                onClick={() => onAnswer(index)}
                aria-keyshortcuts={String(index + 1)}
                className={`relative flex min-h-20 items-center justify-center rounded-2xl border-2 px-3 py-3 shadow-[0_4px_0_hsl(var(--journey-wood)/.12)] transition active:translate-y-0.5 active:shadow-none disabled:cursor-default ${tone}`}
              >
                <kbd aria-hidden="true" className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-md bg-journey-sand text-xs font-black text-journey-ink">
                  {index + 1}
                </kbd>
                {kanaPrompt ? (
                  // Significados de kanji são palavras: fonte menor e quebra de linha para caber em 2 colunas no celular.
                  <span className={`font-display font-black ${kanji ? "text-lg leading-tight [overflow-wrap:anywhere]" : "text-2xl"}`}>{option.label}</span>
                ) : (
                  <span lang="ja" className="font-jp text-4xl font-black leading-none">
                    {option.label}
                  </span>
                )}
                {/* Ícones no canto, fora do fluxo: aparecer não empurra o texto nem muda a altura. */}
                {answered && isCorrect && <Check size={18} strokeWidth={3} aria-hidden="true" className="absolute bottom-2 right-2" />}
                {answered && isChosen && !isCorrect && <X size={18} strokeWidth={3} aria-hidden="true" className="absolute bottom-2 right-2" />}
                {answered && isCorrect && <span className="sr-only">(correta)</span>}
                {answered && isChosen && !isCorrect && <span className="sr-only">(sua resposta)</span>}
              </button>
            );
          })}
        </div>

        {/* Região live sempre montada: o feedback só é anunciado se o elemento já existir. */}
        <p className="sr-only" role="status" aria-live="polite">
          {feedbackMessage(answer)}
        </p>

        <div className={`mt-4 flex flex-col items-center rounded-2xl border-2 px-4 py-3 text-center transition-colors ${slotTone}`}>
          {/* Duas linhas reservadas: a maior resposta ("Tempo esgotado. A resposta era 先 (…)") cabe em 390px. */}
          <p className="flex min-h-10 items-center justify-center text-sm font-black leading-5 text-journey-ink" aria-hidden="true">
            {answer ? feedbackMessage(answer) : "Toque numa alternativa ou use 1–4."}
          </p>
          <button
            ref={nextRef}
            type="button"
            onClick={onNext}
            disabled={!answered}
            aria-keyshortcuts="Enter"
            className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-journey-gold/60 bg-journey-orange px-6 text-sm font-black text-white shadow-[0_5px_0_hsl(var(--journey-orange)/.45)] transition hover:bg-journey-orange-hover active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:border-journey-wood/15 disabled:bg-journey-wood/20 disabled:text-journey-ink/60 disabled:shadow-none"
          >
            {finished ? "Ver resultado" : "Próxima"} (Enter) <ArrowRight size={16} aria-hidden="true" />
          </button>
          {/* Fixo durante a rodada inteira (o avanço automático não muda no meio). */}
          {run.autoAdvance && (
            <p className="mt-2 text-[11px] font-bold text-journey-ink/75">{answered ? "Avançando sozinho…" : "Avanço automático ligado"}</p>
          )}
        </div>
      </div>
    </section>
  );
}
