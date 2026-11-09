import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Clock3, Target } from "lucide-react";
import { CountdownTrack } from "@/features/dojo/shared/components/CountdownBar";
import { useCountdownBar } from "@/features/dojo/shared/useCountdownBar";
import { formatTimer } from "@/features/dojo/shared/format";
import { ADVANCED_RESPONSE_LIMIT_MS } from "../constants";
import { countCurrentCombo, getComboGoal } from "../metrics";
import type { DojoPrompt, DojoSession } from "../types";

const ADVANCED_LIMIT_SECONDS = ADVANCED_RESPONSE_LIMIT_MS / 1000;

/**
 * Computador (mouse ou trackpad, com teclado físico): o Espaço também confirma. No celular o Espaço
 * do teclado virtual fica colado nas letras e confirmava sem querer, então lá só o Enter vale.
 */
export const SPACE_CONFIRMS_QUERY = "(pointer: fine)";

function spaceConfirmsHere() {
  try {
    return typeof window.matchMedia === "function" && window.matchMedia(SPACE_CONFIRMS_QUERY).matches;
  } catch {
    return false;
  }
}

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

/** Placa do HUD: baixa no celular (o espaço acima do teclado é curto), a de sempre a partir do `sm`. */
function HudTile({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-journey-wood/10 bg-white/75 px-2.5 py-1.5 sm:rounded-2xl sm:p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-journey-ink/65">
        {icon}
        {label}
      </p>
      <p className="truncate text-sm font-black text-journey-ink sm:mt-1.5 sm:text-lg">{value}</p>
    </div>
  );
}

interface AdvancedHudProps {
  combo: number;
  goal: number;
  promptId: string;
  shownAt: number | null;
  onTimeout: (promptId: string) => void;
}

/** HUD do Avançado. Usa `key={prompt.id}` no pai, então cada kana começa com a barra cheia. */
function AdvancedHud({ combo, goal, promptId, shownAt, onTimeout }: AdvancedHudProps) {
  // O relógio só começa quando o kana foi realmente pintado (`shownAt`).
  const { barRef, seconds, level } = useCountdownBar(ADVANCED_RESPONSE_LIMIT_MS, shownAt, onTimeout, promptId);

  return (
    <div className="mt-3 sm:mt-4">
      <div className="grid grid-cols-3 gap-2">
        <HudTile label="Combo" value={`${combo}x`} />
        <HudTile label="Meta" value={`${goal}x`} />
        <HudTile label="Tempo" value={`${seconds}s`} icon={<Clock3 size={14} aria-hidden="true" />} />
      </div>
      <CountdownTrack barRef={barRef} level={level} className="mt-2 sm:mt-3" />
    </div>
  );
}

interface TrainingCardProps {
  session: DojoSession;
  prompt: DojoPrompt;
  startedAtPerf: number;
  onPromptShown: (promptId: string, now: number) => void;
  /** `final: false` enquanto digita; `true` quando a pessoa confirma (Enter, ou Espaço no computador). */
  onAnswer: (promptId: string, value: string, final: boolean) => void;
  onTimeout: (promptId: string) => void;
}

export function TrainingCard({ session, prompt, startedAtPerf, onPromptShown, onAnswer, onTimeout }: TrainingCardProps) {
  const { settings, attempts } = session;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [focused, setFocused] = useState(true);
  // Lido uma vez: o tipo de aparelho não muda no meio da batalha.
  const [spaceConfirms] = useState(spaceConfirmsHere);
  // O texto digitado pertence a um prompt; ao trocar de kana ele "zera" sem remontar o input
  // (remontar fecharia o teclado do celular).
  const [typed, setTyped] = useState({ promptId: prompt.id, value: "" });
  const value = typed.promptId === prompt.id ? typed.value : "";

  const combo = settings.difficulty === "jonin" ? countCurrentCombo(attempts) : 0;
  const comboGoal = settings.difficulty === "jonin" ? getComboGoal(attempts.length) : 0;
  const progress = settings.mode === "quantity" ? Math.min(100, Math.round((attempts.length / settings.targetCount) * 100)) : 0;
  const confirmHint = spaceConfirms ? "Enter ou Espaço confirma" : "Enter confirma";

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
    // Romaji não tem espaço: o do teclado do celular (ou de uma sugestão automática) some aqui.
    const next = event.target.value.replace(/\s+/g, "").toLowerCase();
    if (next === value) return;
    setTyped({ promptId: prompt.id, value: next });
    onAnswer(prompt.id, next, false);
  }

  function confirm() {
    // Enter sem querer com o campo vazio não conta como erro.
    if (value !== "") onAnswer(prompt.id, value, true);
  }

  // O Enter do teclado do celular ("Enviar") chega aqui pelo envio do formulário, em qualquer navegador.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    confirm();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Teclado japonês (IME): ali Enter e Espaço escolhem a conversão, não confirmam a resposta.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;

    const confirmKey = event.key === "Enter" || (spaceConfirms && event.key === " ");
    if (!confirmKey) return;

    // Segurar a tecla não confirma o próximo kana (nem escreve espaços).
    event.preventDefault();
    if (!event.repeat) confirm();
  }

  return (
    <div onClick={() => inputRef.current?.focus({ preventScroll: true })}>
      <div className="flex items-center justify-between gap-4 text-[11px] font-black uppercase tracking-[0.12em] text-journey-ink/70 sm:text-xs">
        <span className="inline-flex shrink-0 items-center gap-1.5">
          {settings.mode === "timed" ? <Clock3 size={14} aria-hidden="true" /> : <Target size={14} aria-hidden="true" />}
          {settings.mode === "quantity" ? (
            `${attempts.length}/${settings.targetCount}`
          ) : settings.mode === "timed" ? (
            <SessionClock endsAt={startedAtPerf + settings.timeLimitSeconds * 1000} />
          ) : (
            `${attempts.length} respostas`
          )}
        </span>
        {/* No celular não existe Esc: lá a saída é o "Encerrar sessão" abaixo. */}
        <span className="text-right">{spaceConfirms ? `${confirmHint} · Esc encerra` : confirmHint}</span>
      </div>

      {settings.mode === "quantity" && (
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-journey-wood/10 sm:mt-4"
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

      {/* Sem animação de entrada: ela entraria no tempo de reação medido. No celular o cartão é mais
          baixo, para o kana e o campo caberem juntos acima do teclado virtual sem o navegador precisar
          rolar a tela (rolar empurrava o cabeçalho para cima). */}
      <div className="mx-auto mt-3 flex min-h-28 flex-col items-center justify-center rounded-[1.5rem] border-2 border-journey-wood/15 bg-white px-4 py-2 shadow-[0_5px_0_hsl(var(--journey-wood)/.12)] sm:mt-7 sm:min-h-60 sm:rounded-[1.75rem] sm:py-7">
        <span lang="ja" data-testid="reflexes-prompt" className="font-jp text-[6rem] font-black leading-none text-journey-ink sm:text-[9rem]">
          {prompt.kana.char}
        </span>
        {settings.difficulty === "genin" && (
          <p className="mt-2 text-xs font-bold text-journey-ink/70 sm:mt-4">Família {prompt.kana.groupTitle}</p>
        )}
      </div>

      <form className="mt-3 sm:mt-6" onSubmit={handleSubmit} noValidate>
        <label className="block">
          <span className="sr-only">Digite o romaji correspondente. {confirmHint} a resposta.</span>
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
            className="w-full rounded-2xl border-2 border-journey-forest-deep bg-white px-5 py-2.5 text-center text-2xl font-black text-journey-ink outline-none transition placeholder:text-journey-ink/40 focus:border-journey-orange focus:ring-4 focus:ring-journey-orange/15 sm:py-4"
            placeholder="romaji"
          />
        </label>
      </form>

      {!focused && <p className="mt-2 text-xs font-bold text-journey-orange">Toque aqui para continuar digitando.</p>}
      {settings.difficulty === "jonin" && (
        <p className={`mt-3 text-xs font-extrabold ${combo >= comboGoal ? "text-emerald-800" : "text-journey-ink/70"}`}>
          {combo >= comboGoal
            ? "Meta de combo batida. Continue sem errar."
            : `Você tem ${ADVANCED_LIMIT_SECONDS} segundos para confirmar: depois disso o combo quebra.`}
        </p>
      )}
    </div>
  );
}
