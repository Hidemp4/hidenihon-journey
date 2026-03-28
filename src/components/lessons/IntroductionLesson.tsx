import { useState } from "react";
import { ChevronRight, Volume2 } from "lucide-react";
import type { JapaneseChar } from "@/data/hiragana";
import StrokeOrderAnimation from "@/components/StrokeOrderAnimation";

interface IntroductionLessonProps {
  chars: JapaneseChar[];
  onComplete: () => void;
}

const jpFont = { fontFamily: "'M PLUS Rounded 1c', 'Noto Sans JP', sans-serif" };

export default function IntroductionLesson({ chars, onComplete }: IntroductionLessonProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = chars[currentIndex];
  const hasNext = currentIndex < chars.length - 1;
  if (!current) return null;

  const handleNext = () => (hasNext ? setCurrentIndex(i => i + 1) : onComplete());

  const playAudio = () => {
    if (!("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(current.char);
    utter.lang = "ja-JP";
    utter.rate = 0.8;
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="flex flex-col gap-5 px-4 pb-6 animate-fade-in-up">
      <div className="flex justify-center gap-2">
        {chars.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === currentIndex ? 20 : 8,
              height: 8,
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

      <div className="rounded-3xl bg-card border border-border p-6 flex flex-col items-center gap-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Caractere
        </p>
        <div
          key={current.char}
          className="flex items-center justify-center rounded-2xl animate-scale-in"
          style={{
            width: 160,
            height: 160,
            background: "hsl(40 30% 97%)",
            border: "3px solid hsl(var(--border))",
            fontSize: 110,
            ...jpFont,
            lineHeight: 1,
            color: "hsl(var(--foreground))",
          }}
        >
          {current.char}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card border border-border p-4 flex flex-col items-center gap-2 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Romaji
          </p>
          <span
            className="text-4xl font-bold"
            style={{ color: "hsl(var(--primary))" }}
          >
            {current.romaji}
          </span>
          <button
            onClick={playAudio}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all active:scale-95"
            style={{
              background: "hsl(var(--primary) / 0.1)",
              color: "hsl(var(--primary))",
            }}
          >
            <Volume2 size={13} />
            Ouvir
          </button>
        </div>

        <div className="rounded-2xl bg-card border border-border p-3 flex flex-col items-center gap-1 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Traços
          </p>
          <StrokeOrderAnimation char={current.char} size={90} autoPlay loop />
          <span className="text-xs text-muted-foreground">
            {current.strokeCount} traço{current.strokeCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div
        className="rounded-2xl px-4 py-3 text-sm"
        style={{
          background: "hsl(var(--accent) / 0.15)",
          color: "hsl(var(--foreground))",
        }}
      >
        <span className="font-semibold">💡 Dica: </span>
        Observe a animação dos traços. A escrita japonesa segue a ordem{" "}
        <strong>esquerda → direita</strong> e <strong>cima → baixo</strong>.
      </div>

      <button
        onClick={handleNext}
        className="flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold transition-all active:scale-95"
        style={{
          background: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          boxShadow: "0 4px 20px hsl(var(--primary) / 0.35)",
        }}
      >
        {hasNext ? "Próxima letra" : "Ir para exercícios"}
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
