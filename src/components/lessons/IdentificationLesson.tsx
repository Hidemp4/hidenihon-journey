import { useState, useEffect, useRef, useCallback } from "react";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import type { JapaneseChar } from "@/data/hiragana";

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
const jpFont = { fontFamily: "'M PLUS Rounded 1c', 'Noto Sans JP', sans-serif" };

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function buildRows(chars: JapaneseChar[], pool: JapaneseChar[]): Row[] {
  return chars.slice(0, 5).map(({ char, romaji }) => ({
    targetRomaji: romaji,
    targetChar: char,
    options: shuffle([char, ...shuffle(pool.filter(p => p.char !== char)).slice(0, 4).map(p => p.char)]),
    selected: null,
    correct: null,
  }));
}

function getRowTone(correct: Row["correct"]) {
  if (correct === true) {
    return {
      background: "hsl(var(--success-bg))",
      borderColor: "hsl(var(--success))",
      romajiBg: "hsl(var(--success) / 0.2)",
      romajiColor: "hsl(var(--success))",
    };
  }
  if (correct === false) {
    return {
      background: "hsl(var(--error-bg))",
      borderColor: "hsl(var(--primary))",
      romajiBg: "hsl(var(--primary) / 0.12)",
      romajiColor: "hsl(var(--primary))",
    };
  }
  return {
    background: "hsl(var(--card))",
    borderColor: "hsl(var(--border))",
    romajiBg: "hsl(var(--muted))",
    romajiColor: "hsl(var(--foreground))",
  };
}

function getOptionTone(
  finished: boolean,
  isSelected: boolean,
  isCorrectChar: boolean,
  rowCorrect: Row["correct"]
) {
  if ((finished && isCorrectChar) || (isSelected && rowCorrect === true)) {
    return {
      background: "hsl(var(--success) / 0.2)",
      borderColor: "hsl(var(--success))",
      color: "hsl(var(--success))",
    };
  }
  if (isSelected && rowCorrect === false) {
    return {
      background: "hsl(var(--primary) / 0.15)",
      borderColor: "hsl(var(--primary))",
      color: "hsl(var(--primary))",
    };
  }
  return {
    background: "hsl(var(--muted))",
    borderColor: "hsl(var(--border))",
    color: "hsl(var(--foreground))",
  };
}

export default function IdentificationLesson({ chars, allCharsPool, canSkip = false, onComplete }: IdentificationLessonProps) {
  const [rows, setRows] = useState<Row[]>(() => buildRows(chars, allCharsPool));
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishedRef = useRef(false);

  const finish = useCallback((finalRows: Row[]) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setFinished(true);
    const errorMap: Record<string, number> = {};
    let correct = 0;
    finalRows.forEach(({ targetChar, correct: isCorrect }) => {
      if (isCorrect) correct++;
      if (isCorrect === false) errorMap[targetChar] = (errorMap[targetChar] ?? 0) + 1;
    });
    onComplete(Math.round((correct / finalRows.length) * 100), errorMap);
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    if (finished) return;
    const perfectRows = rows.map((row) => ({ ...row, selected: row.targetChar, correct: true }));
    setRows(perfectRows);
    finish(perfectRows);
  }, [finish, finished, rows]);

  useEffect(() => {
    if (finished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((current) => {
        if (current > 1) return current - 1;
        setRows((prev) => {
          const finalRows = prev.map((row) => row.selected === null ? { ...row, correct: false } : row);
          finish(finalRows);
          return finalRows;
        });
        return 0;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [finish, finished]);

  const handleSelect = (rowIndex: number, value: string) => {
    if (finished) return;
    setRows((prev) => {
      const next = prev.map((row, i) =>
        i !== rowIndex || row.selected !== null
          ? row
          : { ...row, selected: value, correct: value === row.targetChar }
      );
      if (next.every((row) => row.selected !== null)) setTimeout(() => finish(next), 400);
      return next;
    });
  };

  const correctCount = rows.filter((row) => row.correct === true).length;
  const percent = finished ? Math.round((correctCount / rows.length) * 100) : null;
  const timerPercent = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timeLeft > 8 ? "hsl(var(--success))" : timeLeft > 4 ? "hsl(var(--accent))" : "hsl(var(--primary))";
  const clockColor = timeLeft <= 5 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";
  const resultBg = percent === null ? "" : percent >= 80 ? "hsl(var(--success-bg))" : percent >= 60 ? "hsl(var(--warning-bg))" : "hsl(var(--error-bg))";
  const resultBorder = percent === null ? "" : percent >= 80 ? "hsl(var(--success))" : percent >= 60 ? "hsl(var(--warning))" : "hsl(var(--primary))";
  const resultText = percent === null ? "" : percent >= 80 ? "hsl(var(--success))" : percent >= 60 ? "hsl(220 25% 18%)" : "hsl(var(--primary))";
  const resultEmoji = percent === null ? "" : percent >= 80 ? "🎉" : percent >= 60 ? "👍" : "😅";

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <Clock size={18} style={{ color: clockColor }} />
        <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "hsl(var(--progress-track))" }}>
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${timerPercent}%`, background: timerColor }} />
        </div>
        <span className="text-sm font-bold w-6 text-right" style={{ color: timeLeft <= 5 ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}>
          {timeLeft}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Encontre a letra japonesa correspondente ao romaji em cada linha
        </p>
        {canSkip && (
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-xl px-3 py-2 text-xs font-bold transition-all active:scale-95"
            style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
          >
            Pular exercício
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((row, rowIdx) => {
          const tone = getRowTone(row.correct);
          return (
            <div key={`${row.targetChar}-${rowIdx}`} className="rounded-2xl border overflow-hidden" style={{ background: tone.background, borderColor: tone.borderColor }}>
              <div className="flex items-stretch">
                <div
                  className="flex items-center justify-center px-3 py-2 min-w-[52px] font-bold text-sm"
                  style={{ background: tone.romajiBg, color: tone.romajiColor, borderRight: "1px solid hsl(var(--border))" }}
                >
                  {row.targetRomaji}
                </div>

                <div className="flex flex-1 items-center gap-1 px-2 py-2 flex-wrap">
                  {row.options.map((option) => {
                    const optionTone = getOptionTone(finished, row.selected === option, option === row.targetChar, row.correct);
                    return (
                      <button
                        key={option}
                        onClick={() => handleSelect(rowIdx, option)}
                        disabled={row.selected !== null}
                        className="char-card rounded-xl transition-all"
                        style={{ width: 38, height: 38, fontSize: 20, ...jpFont, ...optionTone, border: `2px solid ${optionTone.borderColor}` }}
                      >
                        {option}
                      </button>
                    );
                  })}
                  {row.selected !== null && (
                    <div className="ml-auto">
                      {row.correct ? (
                        <CheckCircle size={20} style={{ color: "hsl(var(--success))" }} />
                      ) : (
                        <XCircle size={20} style={{ color: "hsl(var(--primary))" }} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {finished && percent !== null && (
        <div className="rounded-2xl p-4 text-center animate-scale-in" style={{ background: resultBg, border: `2px solid ${resultBorder}` }}>
          <p className="text-2xl font-bold" style={{ color: resultText }}>
            {resultEmoji} {percent}%
          </p>
          <p className="text-sm text-muted-foreground mt-1">Acertos: {correctCount}/{rows.length}</p>
        </div>
      )}
    </div>
  );
}
