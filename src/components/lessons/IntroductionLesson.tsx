import { useState } from "react";
import { ArrowRight, Lightbulb, Volume2 } from "lucide-react";
import type { JapaneseChar } from "@/data/hiragana";
import StrokeOrderAnimation from "@/components/StrokeOrderAnimation";
import { Button, Eyebrow, LessonStack, SegmentedProgress, Surface } from "./ui";
import { JP_FONT, cx } from "./lessonKit";

interface IntroductionLessonProps {
  chars: JapaneseChar[];
  onComplete: () => void;
}

export default function IntroductionLesson({ chars, onComplete }: IntroductionLessonProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = chars[currentIndex];
  const hasNext = currentIndex < chars.length - 1;
  if (!current) return null;

  const handleNext = () => (hasNext ? setCurrentIndex((i) => i + 1) : onComplete());

  const playAudio = () => {
    if (!("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(current.char);
    utter.lang = "ja-JP";
    utter.rate = 0.8;
    window.speechSynthesis.speak(utter);
  };

  return (
    <LessonStack>
      <SegmentedProgress total={chars.length} current={currentIndex} dots />

      <Surface tone="dark" glow className="flex flex-col items-center gap-3.5 px-5 pb-7 pt-5">
        <Eyebrow tone="accent">
          Letra {currentIndex + 1} de {chars.length}
        </Eyebrow>
        <div
          key={current.char}
          className={cx(
            "grid h-[168px] w-[168px] animate-scale-in place-items-center rounded-full border-[1.5px] border-[hsl(var(--surface-foreground)/0.14)] bg-[hsl(var(--surface-foreground)/0.05)] text-[108px] leading-none",
            JP_FONT
          )}
        >
          {current.char}
        </div>
      </Surface>

      <div className="grid grid-cols-2 gap-3">
        <Surface className="flex flex-col items-center justify-between gap-2.5 p-4">
          <Eyebrow>Romaji</Eyebrow>
          <span className="text-[46px] font-extrabold leading-none tracking-tighter text-primary">
            {current.romaji}
          </span>
          <Button variant="dark" size="sm" iconLeft={Volume2} onClick={playAudio}>
            Ouvir
          </Button>
        </Surface>

        <Surface className="flex flex-col items-center gap-2 p-3.5">
          <Eyebrow>Traços</Eyebrow>
          {/* Fundo branco para a animação ficar legível, independente da cor do traço */}
          <div className="rounded-[20px] border border-border bg-white p-1">
            <StrokeOrderAnimation char={current.char} size={90} autoPlay loop />
          </div>
          <span className="text-xs font-bold text-muted-foreground">
            {current.strokeCount} traço{current.strokeCount !== 1 ? "s" : ""}
          </span>
        </Surface>
      </div>

      <div className="flex items-start gap-3 rounded-3xl border border-[hsl(var(--accent)/0.45)] bg-[hsl(var(--accent)/0.2)] px-4 py-3.5 text-sm leading-snug">
        <span
          aria-hidden
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-[hsl(var(--surface))]"
        >
          <Lightbulb size={15} strokeWidth={2.6} />
        </span>
        <p className="m-0">
          <strong>Dica: </strong>
          observe a animação dos traços. A escrita japonesa segue a ordem{" "}
          <strong>esquerda → direita</strong> e <strong>cima → baixo</strong>.
        </p>
      </div>

      <Button iconRight={ArrowRight} onClick={handleNext}>
        {hasNext ? "Próxima letra" : "Ir para exercícios"}
      </Button>
    </LessonStack>
  );
}