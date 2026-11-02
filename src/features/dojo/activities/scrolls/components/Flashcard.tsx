import { useEffect, useRef, type ReactNode } from "react";
import type { ScrollCard } from "../types";

import { kanjiReadings, type KanjiReading } from "@/features/dojo/shared/content";
import type { KanjiStudyItem, StudyItem } from "@/features/dojo/shared/studyItem";

/** Faces são <span>: dentro de <button> só cabe conteúdo de frase (os estilos fazem o resto). */
function Face({ hidden, back, reduceMotion, children }: { hidden: boolean; back: boolean; reduceMotion: boolean; children: ReactNode }) {
  // Sem movimento: nada gira, as faces só trocam de opacidade (crossfade).
  const motion = reduceMotion
    ? `transition-opacity duration-200 ${hidden ? "opacity-0" : "opacity-100"}`
    : `[backface-visibility:hidden] ${back ? "[transform:rotateY(180deg)]" : ""}`;

  return (
    <span
      aria-hidden={hidden}
      data-face={back ? "back" : "front"}
      className={`flex min-h-64 flex-col items-center justify-center rounded-[1.75rem] border-2 border-journey-wood/15 bg-white px-5 py-8 text-center shadow-[0_5px_0_hsl(var(--journey-wood)/.12)] [grid-area:1/1] sm:min-h-72 ${motion}`}
    >
      {children}
    </span>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-journey-sand px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-journey-wood">{children}</span>;
}

function ReadingRow({ label, readings }: { label: string; readings: readonly KanjiReading[] }) {
  if (readings.length === 0) return null;
  return (
    <span className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-journey-wood">{label}</span>
      {readings.map((reading) => (
        <span key={reading.kana} className="inline-flex items-baseline gap-1.5 rounded-xl bg-journey-sand px-2.5 py-1">
          <span lang="ja" className="font-jp text-xl font-black text-journey-ink">
            {reading.kana}
          </span>
          <span className="text-sm font-extrabold text-journey-ink/80">{reading.romaji}</span>
        </span>
      ))}
    </span>
  );
}

function KanjiAnswer({ item }: { item: KanjiStudyItem }) {
  const { on, kun } = kanjiReadings(item);
  return (
    <>
      <span lang="ja" className="mt-3 font-jp text-[5rem] font-black leading-none text-journey-ink sm:text-[6rem]">
        {item.char}
      </span>
      <ReadingRow label="On" readings={on} />
      <ReadingRow label="Kun" readings={kun} />
      <span className="mt-3 text-xs font-bold text-journey-ink/75">Significado: {item.meanings.join(", ")}</span>
    </>
  );
}

function spoken(readings: readonly KanjiReading[]) {
  return readings.map((reading) => `${reading.kana} (${reading.romaji})`).join(", ");
}

/** O que a região live lê ao virar (depois de "Resposta: <caractere>,"). */
function announcement(item: StudyItem) {
  if (item.kind !== "kanji") return `${item.romaji}.`;
  const { on, kun } = kanjiReadings(item);
  return [on.length > 0 ? `On: ${spoken(on)}.` : "", kun.length > 0 ? `Kun: ${spoken(kun)}.` : "", `Significado: ${item.meanings.join(", ")}.`]
    .filter(Boolean)
    .join(" ");
}

interface FlashcardProps {
  card: ScrollCard;
  flipped: boolean;
  reduceMotion: boolean;
  onFlip: () => void;
}

/**
 * A carta é um botão: clique, toque, Espaço ou Enter viram (uma vez só: depois vêm as notas).
 * A direção é fixa: a frente mostra o caractere; o verso, o romaji (kana) ou as leituras (kanji).
 *
 * Quem usa precisa montar uma carta por `card.key`: se a mesma carta trocasse de conteúdo, ela
 * desviraria animada e o verso da carta seguinte (a resposta) ficaria à vista durante o giro.
 */
export function Flashcard({ card, flipped, reduceMotion, onFlip }: FlashcardProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const { item } = card;
  const status = card.isNew ? "Novo" : "Revisão";

  // Cada carta nova recebe o foco: Espaço/Enter viram direto e o leitor de tela anuncia a pergunta.
  useEffect(() => {
    buttonRef.current?.focus({ preventScroll: true });
  }, [card.key]);

  return (
    <div className="[perspective:1400px]">
      <button
        ref={buttonRef}
        type="button"
        onClick={onFlip}
        aria-disabled={flipped}
        className="block w-full rounded-[1.75rem] outline-none focus-visible:ring-4 focus-visible:ring-journey-orange/50"
      >
        <span className="sr-only">{flipped ? "Carta virada." : "Virar carta."}</span>
        <span
          data-flipper=""
          className={`grid ${reduceMotion ? "" : "transition-transform duration-500 [transform-style:preserve-3d]"} ${
            !reduceMotion && flipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          <Face hidden={flipped} back={false} reduceMotion={reduceMotion}>
            <Chip>{status}</Chip>
            <span lang="ja" className="mt-4 font-jp text-[7rem] font-black leading-none text-journey-ink sm:text-[8.5rem]">
              {item.char}
            </span>
            <span className="mt-5 text-xs font-bold text-journey-ink/70">{item.kind === "kanji" ? "Como se lê?" : "Qual é o romaji?"}</span>
          </Face>

          <Face hidden={!flipped} back reduceMotion={reduceMotion}>
            <Chip>Resposta</Chip>
            {item.kind === "kanji" ? (
              <KanjiAnswer item={item} />
            ) : (
              <>
                <span lang="ja" className="mt-4 font-jp text-[6rem] font-black leading-none text-journey-ink sm:text-[7rem]">
                  {item.char}
                </span>
                <span className="mt-3 font-display text-4xl font-black text-journey-orange">{item.romaji}</span>
                <span className="mt-3 text-xs font-bold text-journey-ink/70">Família {item.groupTitle}</span>
              </>
            )}
          </Face>
        </span>
      </button>

      {/* Região live sempre montada: só anuncia se já existir antes da mudança. */}
      <p className="sr-only" role="status" aria-live="polite">
        {flipped ? (
          <>
            Resposta: <span lang="ja">{item.char}</span>, {announcement(item)}
          </>
        ) : (
          ""
        )}
      </p>
    </div>
  );
}
