import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowRight } from "lucide-react";
import type { ReadingWord } from "@/data/hiragana";
import { Button, Eyebrow, LessonStack, ResultCard, SegmentedProgress, SkipButton, Surface } from "./ui";
import { cx, getResultTone, scorePercent, useFinishOnce } from "./lessonKit";

interface ReadingLessonProps {
  words: ReadingWord[];
  canSkip?: boolean;
  onComplete: (score: number, errorMap: Record<string, number>) => void;
}

type Phase = "word" | "image" | "romaji" | "done";
const phaseDelay: Partial<Record<Phase, number>> = { word: 1000, image: 3000 };

export default function ReadingLesson({ words, canSkip = false, onComplete }: ReadingLessonProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("word");
  const [results, setResults] = useState<boolean[]>([]);
  const advancingRef = useRef(false);
  const { finishOnce, doneRef } = useFinishOnce();
  const currentWord = words[currentIndex];

  useEffect(() => {
    const delay = phaseDelay[phase];
    if (!delay) return;
    const timer = setTimeout(() => setPhase(phase === "word" ? "image" : "romaji"), delay);
    return () => clearTimeout(timer);
  }, [phase, currentIndex]);

  const finishLesson = useCallback(
    (nextResults: boolean[]) =>
      finishOnce(() => {
        setPhase("done");
        onComplete(scorePercent(nextResults.filter(Boolean).length, words.length), {});
      }),
    [finishOnce, onComplete, words.length]
  );

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (advancingRef.current || doneRef.current) return;
      advancingRef.current = true;
      const nextResults = [...results, correct];
      setResults(nextResults);
      if (currentIndex < words.length - 1) {
        setTimeout(() => {
          setCurrentIndex((i) => i + 1);
          setPhase("word");
          advancingRef.current = false;
        }, 500);
        return;
      }
      finishLesson(nextResults);
    },
    [currentIndex, doneRef, finishLesson, results, words.length]
  );

  const handleSkip = useCallback(() => {
    if (doneRef.current) return;
    const perfect = words.map(() => true);
    setResults(perfect);
    finishLesson(perfect);
  }, [doneRef, finishLesson, words]);

  const handleNext = () => phase === "romaji" && handleAnswer(true);
  if (!words.length || !currentWord) return null;

  const correctCount = results.filter(Boolean).length;
  const percent = scorePercent(correctCount, words.length);
  const revealed = phase === "image" || phase === "romaji";

  /* ---------- Resultado ---------- */
  if (phase === "done") {
    const tone = getResultTone(percent);
    return (
      <LessonStack className="gap-5">
        <ResultCard icon={tone.Icon} jp={tone.jp} label={tone.label} percent={percent} caption={`Você leu ${correctCount}/${words.length} palavras`} />

        <div className="flex flex-col gap-2">
          <Eyebrow className="mx-1 mb-0.5">Palavras da lição</Eyebrow>
          <ul className="flex flex-col gap-2">
            {words.map((w, i) => (
              <li key={i}>
                <Surface className="flex items-center gap-3.5 px-4 py-3">
                  <span aria-hidden="true" className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl border-2 border-journey-wood/15 bg-journey-sand text-2xl">
                    {w.emoji}
                  </span>
                  <div className="min-w-0">
                    <p lang="ja" className="m-0 font-jp text-[22px] font-black leading-[1.1] text-journey-ink">
                      {w.word}
                    </p>
                    <p className="mb-0 mt-1 text-xs font-semibold text-journey-ink/75">
                      <span className="font-black text-journey-ink">{w.romaji}</span> · {w.meaning}
                    </p>
                  </div>
                </Surface>
              </li>
            ))}
          </ul>
        </div>
      </LessonStack>
    );
  }

  /* ---------- Exercício ---------- */
  return (
    <LessonStack animated={false}>
      <SegmentedProgress total={words.length} current={currentIndex} />

      <div className="flex items-center justify-between gap-3 px-1">
        <Eyebrow>
          Palavra {currentIndex + 1} de {words.length}
        </Eyebrow>
        {canSkip && <SkipButton onClick={handleSkip} />}
      </div>

      <Surface
        key={currentIndex}
        tone="dark"
        glow={revealed}
        rootClassName="motion-safe:animate-scale-in"
        className="flex min-h-[320px] flex-col items-center justify-center gap-4 p-8"
      >
        <div lang="ja" className="text-center font-jp text-[60px] font-black leading-[1.1] text-white [text-shadow:0_3px_0_hsl(var(--journey-forest-deep)/.6)]">
          {currentWord.word}
        </div>

        <div
          aria-hidden="true"
          className={cx(
            "text-[68px] leading-none motion-safe:transition-all motion-safe:duration-500",
            revealed ? "scale-100 opacity-100" : "scale-[0.6] opacity-0"
          )}
        >
          {currentWord.emoji}
        </div>

        {revealed && (
          <Eyebrow tone="accent" size="md" className="motion-safe:animate-fade-in-up">
            {currentWord.meaning}
          </Eyebrow>
        )}

        <div
          className={cx(
            "motion-safe:transition-all motion-safe:duration-500",
            phase === "romaji" ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          )}
          aria-hidden={phase !== "romaji"}
        >
          <div className="rounded-2xl border-2 border-journey-gold/60 bg-journey-orange px-6 py-2.5 font-display text-2xl font-black tracking-tight text-white shadow-[0_5px_0_hsl(var(--journey-orange)/.45)]">
            {currentWord.romaji}
          </div>
        </div>
      </Surface>

      {/* Região live sempre montada: anuncia o significado e depois a leitura, quando aparecem. */}
      <p className="sr-only" role="status" aria-live="polite">
        {phase === "image" ? `Significado: ${currentWord.meaning}.` : phase === "romaji" ? `Leitura: ${currentWord.romaji}.` : ""}
      </p>

      {phase === "image" && (
        <div className="flex flex-col items-center gap-2 motion-safe:animate-fade-in-up">
          <Eyebrow>Tente ler em japonês</Eyebrow>
          <div aria-hidden="true" className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-2 w-2 rounded-full bg-journey-orange motion-safe:animate-pulse" style={{ animationDelay: `${i * 0.4}s` }} />
            ))}
          </div>
        </div>
      )}

      {phase === "romaji" && (
        <Button iconRight={ArrowRight} onClick={handleNext} disabled={advancingRef.current} className="motion-safe:animate-fade-in-up">
          {currentIndex < words.length - 1 ? "Próxima palavra" : "Concluir lição"}
        </Button>
      )}
    </LessonStack>
  );
}
