import { useState } from "react";
import { ArrowRight, Lightbulb, Volume2 } from "lucide-react";
import type { JapaneseChar } from "@/data/hiragana";
import StrokeOrderAnimation from "@/components/StrokeOrderAnimation";
import { Button, Eyebrow, LessonStack, SegmentedProgress, Surface } from "./ui";

/** Letras (kana/kanji) ou itens (frases do Japonês na Prática). */
const UNITS = {
  letter: { label: "Letra", next: "Próxima letra" },
  item: { label: "Item", next: "Próximo item" },
} as const;

interface IntroductionLessonProps {
  chars: JapaneseChar[];
  unit?: keyof typeof UNITS;
  onComplete: () => void;
}

export default function IntroductionLesson({ chars, unit = "letter", onComplete }: IntroductionLessonProps) {
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

  // Palavras (Japonês na Prática) não cabem no tamanho de uma letra só.
  const long = Array.from(current.char).length > 1;

  return (
    <LessonStack>
      <SegmentedProgress total={chars.length} current={currentIndex} dots />

      {/* O caractere no palco: moldura floresta, papel por dentro (como as cartas do Dojô). */}
      <Surface tone="dark" className="p-2.5 sm:p-3">
        <div className="rounded-[1.5rem] bg-journey-sand p-4">
          <div className="flex items-center justify-between gap-3">
            <Eyebrow tone="muted">
              {UNITS[unit].label} {currentIndex + 1} de {chars.length}
            </Eyebrow>
            {current.strokeCount > 0 && (
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-journey-wood">
                {current.strokeCount} traço{current.strokeCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div
            key={current.char}
            lang="ja"
            className={`mt-3 grid min-h-48 place-items-center rounded-[1.25rem] border-2 border-journey-wood/15 bg-white px-3 font-jp font-black leading-none text-journey-ink shadow-[0_5px_0_hsl(var(--journey-wood)/.12)] motion-safe:animate-scale-in ${
              long ? "text-6xl" : "text-[7rem]"
            }`}
          >
            {current.char}
          </div>
        </div>
      </Surface>

      <div className="grid grid-cols-2 gap-3">
        <Surface className="flex flex-col items-center justify-between gap-3 p-4 text-center">
          <Eyebrow>Romaji</Eyebrow>
          <span className="break-all font-display text-[40px] font-black leading-none tracking-tighter text-journey-orange">{current.romaji}</span>
          <Button variant="dark" size="sm" iconLeft={Volume2} onClick={playAudio}>
            Ouvir
          </Button>
        </Surface>

        <Surface className="flex flex-col items-center gap-2 p-3.5">
          <Eyebrow>Traços</Eyebrow>
          <StrokeOrderAnimation char={current.char} size={90} autoPlay loop />
        </Surface>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border-2 border-journey-gold/60 bg-journey-gold/15 px-4 py-3.5 text-sm font-semibold leading-snug text-journey-ink">
        <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-journey-gold text-journey-ink">
          <Lightbulb size={15} strokeWidth={2.6} />
        </span>
        <p className="m-0">
          <strong className="font-black">Dica: </strong>
          observe a animação dos traços. A escrita japonesa segue a ordem <strong className="font-black">esquerda → direita</strong> e{" "}
          <strong className="font-black">cima → baixo</strong>.
        </p>
      </div>

      <Button iconRight={ArrowRight} onClick={handleNext}>
        {hasNext ? UNITS[unit].next : "Ir para exercícios"}
      </Button>
    </LessonStack>
  );
}
