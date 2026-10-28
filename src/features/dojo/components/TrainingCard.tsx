import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Clock3, Target } from "lucide-react";
import { ADVANCED_RESPONSE_LIMIT_MS } from "../constants";
import { formatTimer } from "../format";
import { countCurrentCombo, getComboGoal } from "../metrics";
import type { DojoPrompt, DojoSession } from "../types";
import { MetricCard } from "./ui";

const ADVANCED_LIMIT_SECONDS = ADVANCED_RESPONSE_LIMIT_MS / 1000;

type TimerLevel = "high" | "mid" | "low";

const TIMER_COLORS: Record<TimerLevel, string> = {
  high: "bg-journey-leaf",
  mid: "bg-journey-orange",
  low: "bg-red-600",
};

/** Relógio do modo "Tempo": tem estado próprio, então só ele re-renderiza a cada tick. */
function SessionClock({ endsAt }: { endsAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((endsAt - performance.now()) / 1000)));

  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Math.ceil((endsAt - performance.now()) / 1000)));
    update();
    const intervalId = window.setInterval(update, 250);
    return () => window.clearInterval(intervalId);
  }, [endsAt]);

  return <>{formatTimer(remaining)}</>;
}

interface AdvancedHudProps {
  combo: number;
  goal: number;
  promptId: string;
  shownAt: number | null;
  onTimeout: (promptId: string) => void;
}

/**
 * HUD do Avançado. Usa `key={prompt.id}` no pai, então cada kana começa com a barra cheia.
 * A barra é movida direto no DOM (transform) e só o texto de segundos usa estado:
 * a página inteira não re-renderiza a cada frame.
 */
function AdvancedHud({ combo, goal, promptId, shownAt, onTimeout }: AdvancedHudProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [seconds, setSeconds] = useState(ADVANCED_LIMIT_SECONDS);
  const [level, setLevel] = useState<TimerLevel>("high");

  useEffect(() => {
    // O relógio só começa quando o kana foi realmente pintado.
    if (shownAt == null) return;

    let frameId = 0;
    const tick = () => {
      const remaining = Math.max(0, ADVANCED_RESPONSE_LIMIT_MS - (performance.now() - shownAt));
      const ratio = remaining / ADVANCED_RESPONSE_LIMIT_MS;

      if (barRef.current) barRef.current.style.transform = `scaleX(${ratio})`;
      setSeconds(Math.ceil(remaining / 1000));
      setLevel(ratio <= 0.3 ? "low" : ratio <= 0.6 ? "mid" : "high");

      if (remaining <= 0) {
        onTimeout(promptId); // o reducer ignora se o prompt já foi resolvido
        return;
      }
      frameId = requestAnimationFrame(tick);
    };

    tick();
    return () => cancelAnimationFrame(frameId);
  }, [onTimeout, promptId, shownAt]);

  return (
    <div className="mt-4">
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="Combo" value={`${combo}x`} />
        <MetricCard label="Meta ninja" value={`${goal}x`} />
        <MetricCard label="Tempo" value={`${seconds}s`} icon={<Clock3 size={14} />} />
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-journey-wood/10" aria-hidden="true">
        <div ref={barRef} className={`h-full origin-left rounded-full ${TIMER_COLORS[level]}`} style={{ transform: "scaleX(1)" }} />
      </div>
    </div>
  );
}

interface TrainingCardProps {
  session: DojoSession;
  prompt: DojoPrompt;
  startedAtPerf: number;
  onPromptShown: (promptId: string, now: number) => void;
  onAnswer: (promptId: string, value: string, final: boolean) => void;
  onTimeout: (promptId: string) => void;
}

export function TrainingCard({ session, prompt, startedAtPerf, onPromptShown, onAnswer, onTimeout }: TrainingCardProps) {
  const { settings, attempts } = session;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [focused, setFocused] = useState(true);
  // O texto digitado pertence a um prompt; ao trocar de kana ele "zera" sem remontar o input
  // (remontar fecharia o teclado do celular).
  const [typed, setTyped] = useState({ promptId: prompt.id, value: "" });
  const value = typed.promptId === prompt.id ? typed.value : "";

  const combo = settings.difficulty === "jonin" ? countCurrentCombo(attempts) : 0;
  const comboGoal = settings.difficulty === "jonin" ? getComboGoal(attempts.length) : 0;
  const progress = settings.mode === "quantity" ? Math.min(100, Math.round((attempts.length / settings.targetCount) * 100)) : 0;

  // Marca `shownAt` depois que o navegador pintou o kana (e não quando o React criou o prompt).
  const awaitingPaint = prompt.shownAt == null;
  useEffect(() => {
    if (!awaitingPaint) return;

    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => onPromptShown(prompt.id, performance.now()));
    });

    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, [awaitingPaint, onPromptShown, prompt.id]);

  // Devolve o foco ao input a cada kana (sem depender de setTimeout).
  useEffect(() => {
    const input = inputRef.current;
    if (input && document.activeElement !== input) input.focus({ preventScroll: true });
  }, [prompt.id]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value.toLowerCase();
    setTyped({ promptId: prompt.id, value: next });
    onAnswer(prompt.id, next, false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onAnswer(prompt.id, value, true);
  }

  return (
    <div onClick={() => inputRef.current?.focus({ preventScroll: true })}>
      <div className="flex items-center justify-between gap-4 text-[11px] font-black uppercase tracking-[0.12em] text-journey-ink/70 sm:text-xs">
        <span className="inline-flex items-center gap-1.5">
          {settings.mode === "timed" ? <Clock3 size={14} /> : <Target size={14} />}
          {settings.mode === "quantity" ? (
            `${attempts.length}/${settings.targetCount}`
          ) : settings.mode === "timed" ? (
            <SessionClock endsAt={startedAtPerf + settings.timeLimitSeconds * 1000} />
          ) : (
            `${attempts.length} respostas`
          )}
        </span>
        <span>Esc encerra</span>
      </div>

      {settings.mode === "quantity" && (
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-journey-wood/10"
          role="progressbar"
          aria-label="Progresso da rodada"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="h-full rounded-full bg-journey-orange transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}

      {settings.difficulty === "jonin" && (
        <AdvancedHud key={prompt.id} combo={combo} goal={comboGoal} promptId={prompt.id} shownAt={prompt.shownAt} onTimeout={onTimeout} />
      )}

      {/* Sem animação de entrada: ela entraria no tempo de reação medido. */}
      <div className="mx-auto mt-7 grid min-h-48 place-items-center rounded-[1.75rem] border-2 border-journey-wood/15 bg-white px-4 py-7 shadow-[0_5px_0_hsl(var(--journey-wood)/.12)] sm:min-h-60">
        <span className="font-jp text-[7rem] font-black leading-none text-journey-ink sm:text-[9rem]">{prompt.kana.char}</span>
      </div>

      {settings.difficulty === "genin" && (
        <p className="mb-4 mt-3 text-xs font-bold text-journey-ink/70">Família {prompt.kana.groupTitle}</p>
      )}
      {settings.difficulty === "jonin" && (
        <p className={`mb-4 mt-3 text-xs font-extrabold ${combo >= comboGoal ? "text-emerald-800" : "text-journey-ink/70"}`}>
          {combo >= comboGoal
            ? "Meta de combo batida. Continue sem errar."
            : `Você tem ${ADVANCED_LIMIT_SECONDS} segundos: responda antes que o combo seja quebrado.`}
        </p>
      )}
      {settings.difficulty === "chunin" && <div className="h-7" />}

      <label className="block">
        <span className="sr-only">Digite o romaji correspondente. Enter envia a resposta.</span>
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          className="w-full rounded-2xl border-2 border-journey-forest-deep bg-white px-5 py-4 text-center text-2xl font-black text-journey-ink outline-none transition placeholder:text-journey-ink/40 focus:border-journey-orange focus:ring-4 focus:ring-journey-orange/15"
          placeholder="romaji"
        />
      </label>
      {!focused && <p className="mt-2 text-xs font-bold text-journey-orange">Toque aqui para continuar digitando.</p>}
    </div>
  );
}
