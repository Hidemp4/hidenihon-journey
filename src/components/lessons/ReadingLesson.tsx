import { useState, useEffect, useCallback } from "react";
import { ChevronRight } from "lucide-react";
import type { ReadingWord } from "@/data/hiragana";

interface ReadingLessonProps {
  words: ReadingWord[];
  onComplete: (score: number, errorMap: Record<string, number>) => void;
}

type Phase = "word" | "image" | "romaji" | "done";
const jpFont = { fontFamily: "'M PLUS Rounded 1c', 'Noto Sans JP', sans-serif" };
const phaseDelay: Partial<Record<Phase, number>> = { word: 1000, image: 3000 };

export default function ReadingLesson({ words, onComplete }: ReadingLessonProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("word");
  const [results, setResults] = useState<boolean[]>([]);
  const currentWord = words[currentIndex];

  useEffect(() => {
    const delay = phaseDelay[phase];
    if (!delay) return;
    const timer = setTimeout(() => setPhase(phase === "word" ? "image" : "romaji"), delay);
    return () => clearTimeout(timer);
  }, [phase, currentIndex]);

  const handleAnswer = useCallback(
    (correct: boolean) => {
      const nextResults = [...results, correct];
      setResults(nextResults);
      if (currentIndex < words.length - 1) {
        setTimeout(() => {
          setCurrentIndex(i => i + 1);
          setPhase("word");
        }, 500);
        return;
      }
      setPhase("done");
      const correctCount = nextResults.filter(Boolean).length;
      onComplete(Math.round((correctCount / words.length) * 100), {});
    },
    [currentIndex, results, words.length, onComplete]
  );

  const handleNext = () => phase === "romaji" && handleAnswer(true);
  if (!words.length || !currentWord) return null;
  const correctCount = results.filter(Boolean).length;
  const percent = Math.round((correctCount / words.length) * 100);
  const passed = percent >= 80;

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center gap-5 px-4 pb-6 animate-fade-in-up">
        <div
          className="w-full rounded-3xl p-6 text-center"
          style={{
            background: passed ? "hsl(var(--success-bg))" : "hsl(var(--warning-bg))",
            border: `2px solid ${passed ? "hsl(var(--success))" : "hsl(var(--warning))"}`,
          }}
        >
          <p className="text-5xl mb-2">{passed ? "🎉" : "📚"}</p>
          <p className="text-3xl font-bold" style={{ color: passed ? "hsl(var(--success))" : "hsl(var(--foreground))" }}>
            {percent}%
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Você leu {correctCount}/{words.length} palavras
          </p>
        </div>

        <div className="w-full flex flex-col gap-2">
          {words.map((w, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-2xl px-4 py-3 border"
              style={{
                background: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{w.emoji}</span>
                <div>
                  <p
                    className="text-xl font-medium"
                    style={jpFont}
                  >
                    {w.word}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {w.romaji} • {w.meaning}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-6">
      <div className="flex items-center gap-2">
        {words.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-2 rounded-full transition-all duration-500"
            style={{
              background:
                i < currentIndex
                  ? "hsl(var(--success))"
                  : i === currentIndex
                  ? "hsl(var(--primary))"
                  : "hsl(var(--border))",
            }}
          />
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Palavra {currentIndex + 1} de {words.length}
      </p>

      <div
        key={currentIndex}
        className="rounded-3xl bg-card border border-border shadow-sm flex flex-col items-center gap-4 p-8 animate-scale-in min-h-[300px] justify-center"
      >
        <div
          className="text-6xl font-medium transition-all duration-300"
          style={{ ...jpFont, color: "hsl(var(--foreground))" }}
        >
          {currentWord.word}
        </div>

        <div
          className="text-7xl transition-all duration-500"
          style={{
            opacity: phase === "image" || phase === "romaji" ? 1 : 0,
            transform: phase === "image" || phase === "romaji" ? "scale(1)" : "scale(0.6)",
          }}
        >
          {currentWord.emoji}
        </div>

        {(phase === "image" || phase === "romaji") && (
          <p className="text-sm text-muted-foreground animate-fade-in-up">
            {currentWord.meaning}
          </p>
        )}

        <div
          className="transition-all duration-500"
          style={{ opacity: phase === "romaji" ? 1 : 0, transform: phase === "romaji" ? "translateY(0)" : "translateY(8px)" }}
        >
          <div
            className="rounded-2xl px-6 py-3 text-2xl font-bold"
            style={{
              background: "hsl(var(--primary) / 0.1)",
              color: "hsl(var(--primary))",
            }}
          >
            {currentWord.romaji}
          </div>
        </div>
      </div>

      {phase === "image" && (
        <div className="flex flex-col items-center gap-2 animate-fade-in-up">
          <p className="text-xs text-muted-foreground">Tente ler em japonês...</p>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  background: "hsl(var(--muted-foreground))",
                  animation: `pulse 1.2s ease-in-out ${i * 0.4}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {phase === "romaji" && (
        <button
          onClick={handleNext}
          className="flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold transition-all active:scale-95 animate-fade-in-up"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            boxShadow: "0 4px 20px hsl(var(--primary) / 0.35)",
          }}
        >
          {currentIndex < words.length - 1 ? "Próxima palavra" : "Concluir lição"}
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}
