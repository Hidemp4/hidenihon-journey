import { useCallback, useState } from "react";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import type { JapaneseChar } from "@/data/hiragana";
import { Eyebrow, LessonStack, ResultCard, SkipButton } from "./ui";
import {
  JP_FONT,
  cx,
  getResultTone,
  scorePercent,
  shuffle,
  useCountdown,
  useFinishOnce,
} from "./lessonKit";

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

const rowTone = (correct: Row["correct"]) =>
  correct === true
    ? { card: "border-[hsl(var(--success))] bg-[hsl(var(--success-bg))]", badge: "bg-[hsl(var(--success))] text-white" }
    : correct === false
    ? { card: "border-[hsl(var(--danger))] bg-[hsl(var(--danger-bg))]", badge: "bg-[hsl(var(--danger))] text-white" }
    : { card: "border-border bg-card", badge: "bg-[hsl(var(--surface))] text-[hsl(var(--surface-foreground))]" };

const optionTone = (finished: boolean, isSelected: boolean, isCorrectChar: boolean, rowCorrect: Row["correct"]) =>
  (finished && isCorrectChar) || (isSelected && rowCorrect === true)
    ? "border-[hsl(var(--success))] bg-[hsl(var(--success))] text-white"
    : isSelected && rowCorrect === false
    ? "border-[hsl(var(--danger))] bg-[hsl(var(--danger))] text-white"
    : "border-border bg-white text-foreground";

export default function IdentificationLesson({
  chars,
  allCharsPool,
  canSkip = false,
  onComplete,
}: IdentificationLessonProps) {
  const [rows, setRows] = useState<Row[]>(() => buildRows(chars, allCharsPool));
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
        onComplete(scorePercent(correct, finalRows.length), errorMap);
      }),
    [finishOnce, onComplete]
  );

  const timeLeft = useCountdown(TIME_LIMIT, !finished, () => {
    const expired = rows.map((row) => (row.selected === null ? { ...row, correct: false } : row));
    setRows(expired);
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
    if (next.every((row) => row.selected !== null)) setTimeout(() => complete(next), 400);
  };

  const correctCount = rows.filter((row) => row.correct === true).length;
  const percent = scorePercent(correctCount, rows.length);
  const urgent = timeLeft <= 5;
  const timerBar = timeLeft > 8 ? "bg-primary" : timeLeft > 4 ? "bg-accent" : "bg-[hsl(var(--danger))]";
  const tone = getResultTone(percent);

  return (
    <LessonStack>
      {/* Timer */}
      <div className="flex items-center gap-3 rounded-full bg-[hsl(var(--surface))] px-4 py-2.5 shadow-[0_12px_28px_hsl(var(--surface)/0.22)]">
        <Clock size={18} strokeWidth={2.4} className={cx("shrink-0", urgent ? "text-[hsl(var(--danger))]" : "text-accent")} />
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[hsl(var(--surface-foreground)/0.14)]">
          <div
            className={cx("h-full rounded-full transition-[width,background] duration-1000 ease-linear", timerBar)}
            style={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
          />
        </div>
        <span
          className={cx(
            "w-7 text-right text-[15px] font-extrabold tabular-nums tracking-tight",
            urgent ? "text-red-300" : "text-white"
          )}
        >
          {timeLeft}
        </span>
      </div>

      {/* Instrução */}
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-sm leading-snug text-muted-foreground">
          Encontre a letra japonesa correspondente ao romaji em cada linha.
        </p>
        {canSkip && <SkipButton onClick={handleSkip} />}
      </div>

      {/* Linhas */}
      <div className="flex flex-col gap-2.5">
        {rows.map((row, rowIdx) => {
          const t = rowTone(row.correct);
          return (
            <div
              key={`${row.targetChar}-${rowIdx}`}
              className={cx(
                "flex items-stretch overflow-hidden rounded-3xl border-[1.5px] shadow-[0_8px_22px_hsl(var(--surface)/0.07)] transition-all duration-200",
                t.card
              )}
            >
              <div
                className={cx(
                  "flex min-w-16 items-center justify-center px-3 py-2 text-[17px] font-extrabold tracking-tight transition-all duration-200",
                  t.badge
                )}
              >
                {row.targetRomaji}
              </div>

              <div className="flex flex-1 flex-wrap items-center gap-1.5 px-3 py-2.5">
                {row.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSelect(rowIdx, option)}
                    disabled={row.selected !== null}
                    aria-label={`Escolher ${option}`}
                    className={cx(
                      "char-card h-[42px] w-[42px] rounded-[14px] border-[1.5px] text-[21px] font-bold transition-all active:scale-95 disabled:cursor-default",
                      JP_FONT,
                      optionTone(finished, row.selected === option, option === row.targetChar, row.correct)
                    )}
                  >
                    {option}
                  </button>
                ))}
                {row.selected !== null &&
                  (row.correct ? (
                    <CheckCircle size={22} strokeWidth={2.4} className="ml-auto text-[hsl(var(--success))]" />
                  ) : (
                    <XCircle size={22} strokeWidth={2.4} className="ml-auto text-[hsl(var(--danger))]" />
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {finished && (
        <ResultCard
          icon={tone.Icon}
          jp={tone.jp}
          label={tone.label}
          percent={percent}
          caption={`Acertos ${correctCount}/${rows.length}`}
        />
      )}
    </LessonStack>
  );
}