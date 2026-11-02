import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { cardLabel, cardState, describeSealEvent, type CardState } from "../a11y";
import { moveGridIndex } from "../gridNavigation";
import type { SealCard, SealsBoard } from "../types";

/** Acima disso (em letras latinas) a face não cabe na fonte grande de uma carta estreita. */
const LONG_FACE = 4;

/** Classes literais: o Tailwind só gera o que aparece escrito no código. */
const GRID_COLUMNS: Readonly<Record<number, string>> = { 3: "grid-cols-3", 4: "grid-cols-4", 6: "grid-cols-6" };

function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) rows.push(items.slice(index, index + size));
  return rows;
}

/** Carimbo do par formado. Com movimento reduzido ele já aparece no lugar, sem cair do alto. */
function SealStamp({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <motion.span
      initial={reduceMotion ? false : { scale: 2.4, opacity: 0, rotate: -32 }}
      animate={{ scale: 1, opacity: 1, rotate: -12 }}
      transition={{ type: "spring", stiffness: 520, damping: 24 }}
      className="absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-md border-2 border-journey-orange bg-white/90 font-jp text-xs font-black leading-none text-journey-orange sm:bottom-1.5 sm:right-1.5 sm:h-8 sm:w-8 sm:text-sm"
    >
      印
    </motion.span>
  );
}

interface SealCardButtonProps {
  card: SealCard;
  state: CardState;
  label: string;
  tabbable: boolean;
  mismatch: boolean;
  reduceMotion: boolean;
  buttonRef: (element: HTMLButtonElement | null) => void;
  onFlip: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onFocus: () => void;
}

function SealCardButton({ card, state, label, tabbable, mismatch, reduceMotion, buttonRef, onFlip, onKeyDown, onFocus }: SealCardButtonProps) {
  const faceUp = state !== "hidden";
  // Sem movimento: nada gira, as faces só trocam de opacidade.
  const spin = reduceMotion ? "" : `transition-transform duration-300 [transform-style:preserve-3d] ${faceUp ? "[transform:rotateY(180deg)]" : ""}`;
  const face = (hidden: boolean, back: boolean) =>
    reduceMotion
      ? `transition-opacity duration-150 ${hidden ? "opacity-0" : "opacity-100"}`
      : `[backface-visibility:hidden] ${back ? "[transform:rotateY(180deg)]" : ""}`;
  const tone =
    state === "matched"
      ? "border-journey-leaf bg-journey-leaf/10"
      : mismatch
        ? "border-journey-wood bg-white"
        : "border-journey-orange bg-white";

  return (
    <button
      ref={buttonRef}
      type="button"
      tabIndex={tabbable ? 0 : -1}
      aria-label={label}
      aria-disabled={faceUp || undefined}
      onClick={onFlip}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      className="relative block aspect-[4/5] min-h-11 w-full rounded-xl outline-none [perspective:800px] focus-visible:ring-4 focus-visible:ring-journey-orange/60 focus-visible:ring-offset-2 focus-visible:ring-offset-journey-sand md:aspect-square"
    >
      <span aria-hidden="true" className={`absolute inset-0 ${spin}`}>
        <span
          className={`absolute inset-0 grid place-items-center overflow-hidden rounded-xl border-2 border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep shadow-[0_3px_0_hsl(var(--journey-wood-deep)/.45)] ${face(faceUp, false)}`}
        >
          <span className="journey-leaf-pattern absolute inset-0 opacity-15" />
          <span className="relative font-jp text-xl font-black text-journey-gold/70 sm:text-2xl">印</span>
        </span>
        <span
          className={`absolute inset-0 grid place-items-center rounded-xl border-2 shadow-[0_3px_0_hsl(var(--journey-wood)/.15)] ${tone} ${face(!faceUp, true)}`}
        >
          <span
            lang={card.face.lang ?? undefined}
            className={
              card.face.lang === "ja"
                ? "font-jp text-3xl font-black leading-none text-journey-ink sm:text-4xl"
                : card.face.text.length > LONG_FACE
                  ? // Significado de kanji ("eletricidade") numa carta de ~70px: menor e quebrando a linha.
                    "px-1 text-center font-display text-[13px] font-black leading-tight text-journey-ink [overflow-wrap:anywhere] sm:text-base"
                  : "font-display text-xl font-black tracking-[-0.02em] text-journey-ink sm:text-2xl"
            }
          >
            {card.face.text}
          </span>
          {state === "matched" && <SealStamp reduceMotion={reduceMotion} />}
        </span>
      </span>
    </button>
  );
}

interface SealsBoardViewProps {
  board: SealsBoard;
  /** Mesa completa: some o "Encerrar" e a dica de teclado (as cartas ficam à mostra). */
  finished: boolean;
  reduceMotion: boolean;
  onFlip: (index: number) => void;
  onAbandon: () => void;
}

/**
 * Grade no padrão ARIA: uma carta só na ordem do Tab (tabindex móvel) e setas para andar.
 * Monte com `key={board.id}`: mesa nova começa do zero (foco e carta ativa).
 */
export function SealsBoardView({ board, finished, reduceMotion, onFlip, onAbandon }: SealsBoardViewProps) {
  const [active, setActive] = useState(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const hintId = useId();

  // Mesa nova: o foco vai para a 1ª carta (Enter/Espaço já viram, setas já andam).
  useEffect(() => {
    buttons.current[0]?.focus({ preventScroll: true });
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.metaKey) return;

    if (event.key === "Enter" || event.key === " ") {
      // Tratado aqui para Enter e Espaço virarem igual em todo navegador. Se o clique nativo vier
      // mesmo assim, virar a mesma carta de novo é ignorado pelo motor.
      event.preventDefault();
      if (!event.repeat) onFlip(index);
      return;
    }

    const next = moveGridIndex(index, event.key, board.columns, board.cards.length, event.ctrlKey);
    if (next == null) return;
    event.preventDefault();
    setActive(next);
    buttons.current[next]?.focus();
  }

  const rows = chunk(board.cards, board.columns);

  return (
    <section
      className={`relative isolate mx-auto overflow-hidden rounded-[2rem] border-2 border-[hsl(var(--journey-wood-deep))] bg-journey-forest-deep p-2.5 shadow-[0_8px_0_hsl(var(--journey-wood-deep)/.35)] sm:p-4 ${
        board.columns > 4 ? "max-w-3xl" : "max-w-2xl"
      }`}
    >
      <div className="journey-leaf-pattern absolute inset-0 opacity-10" aria-hidden="true" />
      <div className="relative rounded-[1.5rem] bg-journey-sand p-3 sm:p-6">
        <div className="flex items-center justify-between gap-3 text-[11px] font-black uppercase tracking-[0.12em] text-journey-ink/75 sm:text-xs">
          <span>
            Pares {board.matchedPairIds.length} de {board.pairs.length}
          </span>
          <span>{finished ? "Mesa completa" : "Esc encerra"}</span>
        </div>

        <div
          role="grid"
          aria-label={`Mesa de selos: ${board.cards.length} cartas, ${board.columns} por linha`}
          aria-describedby={finished ? undefined : hintId}
          className="mt-3 flex flex-col gap-2 sm:gap-3"
        >
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} role="row" className={`grid gap-2 sm:gap-3 ${GRID_COLUMNS[board.columns] ?? "grid-cols-4"}`}>
              {row.map((card) => (
                <div key={card.index} role="gridcell">
                  <SealCardButton
                    card={card}
                    state={cardState(board, card.index)}
                    label={cardLabel(board, card.index)}
                    tabbable={card.index === active}
                    mismatch={board.pendingMoveId != null && board.open.includes(card.index)}
                    reduceMotion={reduceMotion}
                    buttonRef={(element) => {
                      buttons.current[card.index] = element;
                    }}
                    onFlip={() => onFlip(card.index)}
                    onKeyDown={(event) => handleKeyDown(event, card.index)}
                    onFocus={() => setActive(card.index)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Região live sempre montada: só anuncia se já existir antes da mudança. */}
        <p className="sr-only" role="status" aria-live="polite">
          {describeSealEvent(board)}
        </p>

        {!finished && (
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p id={hintId} className="text-center text-xs font-semibold text-journey-ink/75">
              Setas andam pela mesa · Enter ou Espaço vira
            </p>
            <button
              type="button"
              onClick={onAbandon}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border-2 border-journey-wood/20 bg-white px-5 text-sm font-black text-journey-ink transition hover:border-journey-orange/40"
            >
              Encerrar partida
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
