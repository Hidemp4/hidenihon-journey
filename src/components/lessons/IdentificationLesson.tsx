import { useCallback, useState } from "react";
import { Check, Clock, X } from "lucide-react";
import type { JapaneseChar } from "@/data/hiragana";
import { LessonStack, ResultCard, SkipButton } from "./ui";
import { cx, getResultTone, scorePercent, shuffle, useCountdown, useFinishOnce } from "./lessonKit";

interface IdentificationLessonProps {
  chars: JapaneseChar[];
  allCharsPool: JapaneseChar[];
  canSkip?: boolean;
  onComplete: (score: number, errorMap: Record<string, number>) => void;
}

interface Row {
  targetRomaji: string;
  targetChar: string;
  options: string[];
  selected: string | null;
  correct: boolean | null;
}

const TIME_LIMIT = 15;

function buildRows(chars: JapaneseChar[], pool: JapaneseChar[]): Row[] {
  return chars.slice(0, 5).map(({ char, romaji }) => ({
    targetRomaji: romaji,
    targetChar: char,
    options: shuffle([char, ...shuffle(pool.filter((p) => p.char !== char)).slice(0, 4).map((p) => p.char)]),
    selected: null,
    correct: null,
  }));
}

// Mesmas cores do Exame do Dojô: acerto em verde-folha, erro em madeira (o ✓/✗ não depende só da cor).
const rowTone = (correct: Row["correct"]) =>
  correct === true
    ? { card: "border-journey-leaf bg-journey-leaf/10", badge: "bg-journey-leaf text-white" }
    : correct === false
      ? { card: "border-journey-wood bg-journey-wood/10", badge: "bg-journey-wood text-white" }
      : { card: "border-journey-wood/15 bg-white/85", badge: "bg-journey-forest-deep text-journey-gold" };

const optionTone = (finished: boolean, isSelected: boolean, isCorrectChar: boolean, rowCorrect: Row["correct"]) =>
  (finished && isCorrectChar) || (isSelected && rowCorrect === true)
    ? "border-journey-leaf bg-journey-leaf text-white"
    : isSelected && rowCorrect === false
      ? "border-journey-wood bg-journey-wood text-white"
      : "border-journey-wood/15 bg-white text-journey-ink enabled:hover:border-journey-orange/50";

/** Barra do tempo: as mesmas três cores da barra do Relâmpago no Dojô. */
const timerTone = (timeLeft: number) => (timeLeft > 8 ? "bg-journey-leaf" : timeLeft > 4 ? "bg-journey-orange" : "bg-red-600");

export default function IdentificationLesson({
  chars,
  allCharsPool,
  canSkip = false,
  onComplete,
}: IdentificationLessonProps) {
  const [rows, setRows] = useState<Row[]>(() => buildRows(chars, allCharsPool));
  /** O que a região live anuncia (cada escolha, o tempo esgotado e o resultado). */
  const [announcement, setAnnouncement] = useState("");
  const { finished, finishOnce } = useFinishOnce();

  const complete = useCallback(
    (finalRows: Row[]) =>
      finishOnce(() => {
        const errorMap: Record<string, number> = {};
        let correct = 0;
        finalRows.forEach(({ targetChar, correct: isCorrect }) => {
          if (isCorrect) correct++;
          if (isCorrect === false) errorMap[targetChar] = (errorMap[targetChar] ?? 0) + 1;
        });
        setAnnouncement((previous) => `${previous} Resultado: ${correct} de ${finalRows.length} acertos.`.trim());
        onComplete(scorePercent(correct, finalRows.length), errorMap);
      }),
    [finishOnce, onComplete]
  );

  const timeLeft = useCountdown(TIME_LIMIT, !finished, () => {
    const expired = rows.map((row) => (row.selected === null ? { ...row, correct: false } : row));
    setRows(expired);
    setAnnouncement("Tempo esgotado.");
    complete(expired);
  });

  const handleSkip = () => {
    if (finished) return;
    const perfect = rows.map((row) => ({ ...row, selected: row.targetChar, correct: true }));
    setRows(perfect);
    complete(perfect);
  };

  const handleSelect = (rowIndex: number, value: string) => {
    if (finished || rows[rowIndex].selected !== null) return;
    const next = rows.map((row, i) =>
      i === rowIndex ? { ...row, selected: value, correct: value === row.targetChar } : row
    );
    setRows(next);
    const target = rows[rowIndex];
    setAnnouncement(value === target.targetChar ? `${target.targetRomaji}: certo.` : `${target.targetRomaji}: errado. A certa era ${target.targetChar}.`);
    if (next.every((row) => row.selected !== null)) setTimeout(() => complete(next), 400);
  };

  const correctCount = rows.filter((row) => row.correct === true).length;
  const percent = scorePercent(correctCount, rows.length);
  const urgent = timeLeft <= 5;
  const tone = getResultTone(percent);

  return (
    <LessonStack>
      {/* Tempo */}
      <div
        role="timer"
        aria-label={`Tempo restante: ${timeLeft} segundos`}
        className="flex items-center gap-3 rounded-full border-2 border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep px-4 py-2.5 shadow-[0_4px_0_hsl(var(--journey-wood-deep)/.35)]"
      >
        <Clock size={18} strokeWidth={2.4} aria-hidden="true" className={cx("shrink-0", urgent ? "text-red-300" : "text-journey-gold")} />
        <div aria-hidden="true" className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/15">
          <div
            className={cx("h-full rounded-full motion-safe:transition-[width,background-color] motion-safe:duration-1000 motion-safe:ease-linear", timerTone(timeLeft))}
            style={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
          />
        </div>
        <span aria-hidden="true" className={cx("w-7 text-right text-[15px] font-black tabular-nums", urgent ? "text-red-300" : "text-white")}>
          {timeLeft}
        </span>
      </div>

      {/* Instrução */}
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-sm font-semibold leading-snug text-journey-ink/75">Encontre a letra japonesa correspondente ao romaji em cada linha.</p>
        {canSkip && <SkipButton onClick={handleSkip} />}
      </div>

      {/* Linhas */}
      <div className="flex flex-col gap-2.5">
        {rows.map((row, rowIdx) => {
          const t = rowTone(row.correct);
          return (
            <div
              key={`${row.targetChar}-${rowIdx}`}
              role="group"
              aria-label={`Linha ${rowIdx + 1}: ${row.targetRomaji}`}
              className={cx(
                "flex items-stretch overflow-hidden rounded-2xl border-2 shadow-[0_4px_0_hsl(var(--journey-wood)/.12)] motion-safe:transition-colors motion-safe:duration-200",
                t.card
              )}
            >
              {/* O ✓/✗ fica no selo do romaji: aparecer não empurra as alternativas para outra linha. */}
              <div className={cx("flex min-w-16 flex-col items-center justify-center gap-0.5 px-3 py-2 font-display text-[17px] font-black", t.badge)}>
                {row.targetRomaji}
                {row.selected !== null && (row.correct ? <Check size={16} strokeWidth={3.2} aria-hidden="true" /> : <X size={16} strokeWidth={3.2} aria-hidden="true" />)}
              </div>

              <div className="flex flex-1 flex-wrap items-center gap-1.5 px-3 py-2.5">
                {row.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelect(rowIdx, option)}
                    disabled={row.selected !== null}
                    aria-label={`Escolher ${option}`}
                    lang="ja"
                    className={cx(
                      "grid h-11 w-11 place-items-center rounded-xl border-2 font-jp text-[21px] font-black outline-none transition focus-visible:ring-4 focus-visible:ring-journey-orange/40 active:translate-y-0.5 disabled:cursor-default",
                      optionTone(finished, row.selected === option, option === row.targetChar, row.correct)
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Região live sempre montada: só anuncia se já existir antes da mudança. */}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {finished && (
        <ResultCard icon={tone.Icon} jp={tone.jp} label={tone.label} percent={percent} caption={`Acertos ${correctCount}/${rows.length}`} />
      )}
    </LessonStack>
  );
}
