import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Clock3, Flame, Gauge, RotateCcw, Settings2, Target, Trophy, Zap } from "lucide-react";
import { FloatingLearningNav, ReactionStatsIcon } from "@/components/navigation/FloatingLearningNav";
import { filterKanaDeck, getAvailableGroups, type KanaAlphabet } from "./kanaDeck";
import { calculateKanaReactionStats, getPerformanceLabel } from "./metrics";
import { loadLocalKanaReactionSessions, saveLocalKanaReactionSession } from "./localRepository";
import {
  ADVANCED_RESPONSE_LIMIT_MS,
  createAttempt,
  createPrompt,
  createTimeoutAttempt,
  DEFAULT_REACTION_SETTINGS,
  markFirstKey,
  pickNextKana,
  shouldFinishSession,
} from "./sessionEngine";
import type { KanaReactionAttempt, KanaReactionDifficulty, KanaReactionPrompt, KanaReactionSession, KanaReactionSettings } from "./types";

const difficultyOptions: Array<{ id: KanaReactionDifficulty; label: string; rank: string; description: string }> = [
  { id: "genin", label: "Iniciante", rank: "下忍", description: "Mostra a família do kana." },
  { id: "chunin", label: "Intermediário", rank: "中忍", description: "Remove a dica da família." },
  { id: "jonin", label: "Avançado", rank: "上忍", description: "Sem dica e com pressão de combo." },
];

const optionBase = "min-h-11 rounded-xl border px-3 py-2 text-xs font-extrabold transition active:scale-[0.98]";

function formatMs(value: number | null) {
  return value == null ? "—" : `${value}ms`;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes}min` : `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function createSession(settings: KanaReactionSettings): KanaReactionSession {
  return {
    id: crypto.randomUUID(),
    settings,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    attempts: [],
  };
}

function getLastAttempt(attempts?: KanaReactionAttempt[]) {
  return attempts && attempts.length > 0 ? attempts[attempts.length - 1] : null;
}

function countCurrentCombo(attempts: KanaReactionAttempt[]) {
  let combo = 0;

  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    if (!attempts[index].correct) break;
    combo += 1;
  }

  return combo;
}

export default function KanaReactionPage() {
  const [settings, setSettings] = useState<KanaReactionSettings>(DEFAULT_REACTION_SETTINGS);
  const [session, setSession] = useState<KanaReactionSession | null>(null);
  const [prompt, setPrompt] = useState<KanaReactionPrompt | null>(null);
  const [answer, setAnswer] = useState("");
  const [finishedSession, setFinishedSession] = useState<KanaReactionSession | null>(() => loadLocalKanaReactionSessions()[0] ?? null);
  const [now, setNow] = useState(() => Date.now());
  const [advancedNow, setAdvancedNow] = useState(() => performance.now());
  const [battleEffect, setBattleEffect] = useState<{ id: number; type: "correct" | "wrong" | "timeout"; kana: string } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resolvedPromptShownAtRef = useRef<number | null>(null);
  const finishedTimedSessionIdRef = useRef<string | null>(null);
  const reduceMotion = useReducedMotion();
  const sessionId = session?.id;
  const sessionMode = session?.settings.mode;

  const groups = useMemo(() => getAvailableGroups(settings.alphabet), [settings.alphabet]);
  const deck = useMemo(
    () => filterKanaDeck(settings.alphabet, settings.selectedGroupIds),
    [settings.alphabet, settings.selectedGroupIds]
  );
  const stats = useMemo(() => calculateKanaReactionStats(session?.attempts ?? finishedSession?.attempts ?? []), [session, finishedSession]);
  const advancedCombo = session?.settings.difficulty === "jonin" ? countCurrentCombo(session.attempts) : 0;
  const advancedStreakGoal = session?.settings.difficulty === "jonin" ? Math.min(10, Math.max(3, Math.ceil((session.attempts.length + 1) / 2))) : 0;
  const progress = session && settings.mode === "quantity" ? Math.min(100, Math.round((session.attempts.length / settings.targetCount) * 100)) : 0;
  const timedRemainingSeconds = session?.settings.mode === "timed"
    ? Math.max(0, Math.ceil((new Date(session.startedAt).getTime() + session.settings.timeLimitSeconds * 1000 - now) / 1000))
    : null;
  const advancedRemainingMs = session?.settings.difficulty === "jonin" && prompt
    ? Math.max(0, ADVANCED_RESPONSE_LIMIT_MS - (advancedNow - prompt.shownAt))
    : null;
  const advancedRemainingSeconds = advancedRemainingMs == null ? null : Math.ceil(advancedRemainingMs / 1000);
  const advancedTimerProgress = advancedRemainingMs == null ? 100 : (advancedRemainingMs / ADVANCED_RESPONSE_LIMIT_MS) * 100;
  const lastAttempt = getLastAttempt(session?.attempts) ?? getLastAttempt(finishedSession?.attempts);

  const finishTraining = useCallback((nextSession = session) => {
    if (!nextSession) return;

    const completedSession = {
      ...nextSession,
      finishedAt: new Date().toISOString(),
    };

    saveLocalKanaReactionSession(completedSession);
    setFinishedSession(completedSession);
    setSession(null);
    setPrompt(null);
    setAnswer("");
  }, [session]);

  useEffect(() => {
    if (sessionMode !== "timed") return;

    setNow(Date.now());
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(intervalId);
  }, [sessionId, sessionMode]);

  useEffect(() => {
    if (!session || session.settings.mode !== "timed" || timedRemainingSeconds !== 0) return;
    if (finishedTimedSessionIdRef.current === session.id) return;

    finishedTimedSessionIdRef.current = session.id;
    finishTraining();
  }, [finishTraining, session, timedRemainingSeconds]);

  const resolveAttempt = useCallback((attempt: KanaReactionAttempt, activeSession: KanaReactionSession, activePrompt: KanaReactionPrompt) => {
    if (resolvedPromptShownAtRef.current === activePrompt.shownAt) return;
    resolvedPromptShownAtRef.current = activePrompt.shownAt;
    setBattleEffect({
      id: Date.now(),
      type: attempt.answer === "" ? "timeout" : attempt.correct ? "correct" : "wrong",
      kana: attempt.kana,
    });

    const nextAttempts = [...activeSession.attempts, attempt];
    const nextSession = { ...activeSession, attempts: nextAttempts };

    if (shouldFinishSession(activeSession.settings, nextAttempts.length)) {
      finishTraining(nextSession);
      return;
    }

    const recentKana = nextAttempts.map((item) => item.kana);
    const nextKana = pickNextKana(deck, recentKana, activeSession.settings.focusMode);
    if (!nextKana) return;

    setSession(nextSession);
    setPrompt(createPrompt(nextKana));
    setAnswer("");
  }, [deck, finishTraining]);

  useEffect(() => {
    if (!battleEffect) return;
    const timeoutId = window.setTimeout(() => setBattleEffect(null), 700);
    return () => window.clearTimeout(timeoutId);
  }, [battleEffect]);

  useEffect(() => {
    if (!session || !prompt || session.settings.difficulty !== "jonin") return;

    if (resolvedPromptShownAtRef.current !== prompt.shownAt) {
      resolvedPromptShownAtRef.current = null;
    }

    const updateCountdown = () => setAdvancedNow(performance.now());
    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 50);
    const elapsed = Math.max(0, performance.now() - prompt.shownAt);
    const timeoutId = window.setTimeout(() => {
      resolveAttempt(createTimeoutAttempt(prompt), session, prompt);
    }, Math.max(0, ADVANCED_RESPONSE_LIMIT_MS - elapsed));

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [prompt, resolveAttempt, session]);

  function updateSettings(nextSettings: Partial<KanaReactionSettings>) {
    setSettings((current) => ({ ...current, ...nextSettings }));
  }

  function startTraining() {
    const firstKana = pickNextKana(deck, [], settings.focusMode);
    if (!firstKana) return;

    const nextSession = createSession(settings);
    setFinishedSession(null);
    setSession(nextSession);
    setPrompt(createPrompt(firstKana));
    setAnswer("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleAnswerChange(event: ChangeEvent<HTMLInputElement>) {
    if (!prompt || !session) return;

    const value = event.target.value.toLowerCase();
    const activePrompt = prompt.firstKeyAt == null && value.length > 0 ? markFirstKey(prompt) : prompt;
    if (activePrompt !== prompt) setPrompt(activePrompt);
    setAnswer(value);

    const expected = activePrompt.kana.romaji.toLowerCase();
    if (value.length < expected.length) return;

    const attempt = createAttempt(activePrompt, value);
    resolveAttempt(attempt, session, activePrompt);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && session) finishTraining();
    if (event.code === "Space" && !session) {
      event.preventDefault();
      startTraining();
    }
  }

  function toggleGroup(groupId: string) {
    const selectedGroupIds = settings.selectedGroupIds.includes(groupId)
      ? settings.selectedGroupIds.filter((id) => id !== groupId)
      : [...settings.selectedGroupIds, groupId];

    updateSettings({ selectedGroupIds });
  }

  const reveal = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  return (
    <div onKeyDown={handleKeyDown} className="journey-home min-h-screen overflow-hidden bg-journey-surface pb-28 font-ui text-journey-ink">
      <header className="relative isolate overflow-hidden bg-journey-forest-deep px-5 pb-16 pt-8 text-white sm:px-8 lg:px-12 lg:pb-20 lg:pt-10">
        <div className="journey-leaf-pattern absolute inset-0 -z-20 opacity-30" />
        <div className="absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-journey-orange/20 blur-3xl" />
        <div className="absolute -bottom-20 left-1/4 -z-10 h-64 w-64 rounded-full bg-journey-leaf/20 blur-3xl" />
        <div className="absolute right-[-2rem] top-2 font-jp text-[13rem] font-black leading-none text-white/[0.035]" aria-hidden="true">反</div>

        <motion.div
          {...reveal}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="mx-auto max-w-6xl"
        >
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-journey-gold sm:text-xs">
                <Zap size={15} fill="currentColor" /> Do reconhecimento ao reflexo
              </p>
              <h1 className="mt-4 font-display text-4xl font-black leading-[0.92] tracking-[-0.055em] sm:text-6xl">
                Treino de <span className="text-journey-orange">velocidade</span>
              </h1>
              <p className="mt-5 max-w-xl text-sm font-semibold leading-6 text-white/80 sm:text-base">
                Reconheça o kana, digite o romaji e transforme cada resposta em memória rápida.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Resumo de desempenho">
              <MetricCard label="Acerto" value={`${stats.accuracy}%`} dark />
              <MetricCard label="Média" value={formatMs(stats.averageCompletionMs)} dark />
              <MetricCard label="Mediana" value={formatMs(stats.medianCompletionMs)} dark />
            </div>
          </div>
        </motion.div>
      </header>

      <main className="relative mx-auto -mt-8 grid max-w-6xl gap-5 px-5 sm:px-8 lg:grid-cols-[minmax(0,.82fr)_minmax(420px,1.18fr)] lg:px-12">
        <motion.div
          {...reveal}
          transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.05 }}
          className={`space-y-5 ${session || settings.focusMode ? "hidden lg:block" : ""}`}
        >
          {!settings.focusMode && !session && (
            <>
              <section className="scroll-panel p-5 sm:p-6">
                <SectionTitle icon={<Settings2 size={17} />} eyebrow="Preparação" title="Configure sua missão" />

                <SettingGroup label="Alfabeto">
                  <div className="grid grid-cols-3 gap-2">
                    {(["hiragana", "katakana", "mixed"] as KanaAlphabet[]).map((alphabet) => (
                      <OptionButton key={alphabet} active={settings.alphabet === alphabet} onClick={() => updateSettings({ alphabet, selectedGroupIds: [] })}>
                        {alphabet === "mixed" ? "Ambos" : alphabet === "hiragana" ? "Hiragana" : "Katakana"}
                      </OptionButton>
                    ))}
                  </div>
                </SettingGroup>

                <SettingGroup label="Dificuldade">
                  <div className="grid grid-cols-3 gap-2">
                    {difficultyOptions.map((difficulty) => (
                      <OptionButton
                        key={difficulty.id}
                        active={settings.difficulty === difficulty.id}
                        title={difficulty.description}
                        aria-label={`${difficulty.label}: ${difficulty.description}`}
                        onClick={() => updateSettings({ difficulty: difficulty.id })}
                      >
                        <span className="block font-jp text-sm">{difficulty.rank}</span>
                        <span className="mt-0.5 block text-[10px] sm:text-xs">{difficulty.label}</span>
                      </OptionButton>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-journey-ink/50">
                    {difficultyOptions.find(({ id }) => id === settings.difficulty)?.description}
                  </p>
                </SettingGroup>

                <SettingGroup label="Formato">
                  <div className="grid grid-cols-3 gap-2">
                    <OptionButton active={settings.mode === "quantity"} onClick={() => updateSettings({ mode: "quantity" })}>Quantidade</OptionButton>
                    <OptionButton active={settings.mode === "timed"} onClick={() => updateSettings({ mode: "timed" })}>Tempo</OptionButton>
                    <OptionButton active={settings.mode === "free"} onClick={() => updateSettings({ mode: "free" })}>Livre</OptionButton>
                  </div>
                </SettingGroup>

                {settings.mode === "timed" && (
                  <SettingGroup label="Duração">
                    <div className="grid grid-cols-4 gap-2">
                      {[30, 60, 180, 300].map((timeLimitSeconds) => (
                        <OptionButton key={timeLimitSeconds} active={settings.timeLimitSeconds === timeLimitSeconds} onClick={() => updateSettings({ timeLimitSeconds })}>
                          {formatDuration(timeLimitSeconds)}
                        </OptionButton>
                      ))}
                    </div>
                  </SettingGroup>
                )}

                {settings.mode === "quantity" && (
                  <SettingGroup label="Tamanho da rodada">
                    <div className="grid grid-cols-3 gap-2">
                      {[10, 20, 50].map((targetCount) => (
                        <OptionButton key={targetCount} active={settings.targetCount === targetCount} onClick={() => updateSettings({ targetCount })}>
                          {targetCount} kana
                        </OptionButton>
                      ))}
                    </div>
                  </SettingGroup>
                )}

                <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-journey-wood/10 bg-white/55 px-4 py-3">
                  <span>
                    <span className="block text-xs font-black text-journey-ink">Modo foco</span>
                    <span className="mt-1 block text-[10px] font-semibold text-journey-ink/50">Oculta as configurações durante o treino.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.focusMode}
                    onChange={(event) => updateSettings({ focusMode: event.target.checked })}
                    className="h-5 w-5 accent-journey-orange"
                  />
                </label>
              </section>

              <section className="rounded-[1.75rem] border border-journey-wood/10 bg-white/65 p-5 shadow-[0_14px_35px_hsl(var(--journey-wood)/.08)] sm:p-6">
                <SectionTitle eyebrow="Conteúdo" title="Grupos de kana" />
                <div className="flex flex-wrap gap-2">
                  <OptionButton active={settings.selectedGroupIds.length === 0} onClick={() => updateSettings({ selectedGroupIds: [] })}>Todos</OptionButton>
                  {groups.map((group) => (
                    <OptionButton key={group.id} active={settings.selectedGroupIds.includes(group.id)} onClick={() => toggleGroup(group.id)}>
                      {group.title.split(" ")[0]}
                    </OptionButton>
                  ))}
                </div>
              </section>
            </>
          )}
        </motion.div>

        <motion.div
          {...reveal}
          transition={{ duration: 0.55, delay: reduceMotion ? 0 : 0.12 }}
          className={`space-y-5 ${session || settings.focusMode ? "lg:col-span-2 lg:mx-auto lg:w-full lg:max-w-2xl" : ""}`}
        >
          <section className={`relative overflow-hidden rounded-[2.25rem] bg-journey-forest-deep p-3 shadow-[0_26px_60px_hsl(var(--journey-forest-deep)/.2)] sm:p-5 ${session && !reduceMotion ? "isolate" : ""}`}>
            <div className="journey-leaf-pattern absolute inset-0 opacity-10" aria-hidden="true" />
            {session && !reduceMotion && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                {Array.from({ length: 12 }, (_, index) => (
                  <motion.span
                    key={index}
                    className="absolute left-1/2 top-1/2 h-px w-[70%] origin-left bg-gradient-to-r from-journey-gold/70 to-transparent"
                    style={{ rotate: `${index * 30}deg` }}
                    animate={{ opacity: [0.12, 0.55, 0.12], scaleX: [0.65, 1.15, 0.65] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: index * 0.06, ease: "easeInOut" }}
                  />
                ))}
                <motion.div
                  className="absolute -inset-20 rounded-full border border-journey-orange/30"
                  animate={{ rotate: 360, scale: [0.78, 1, 0.78] }}
                  transition={{ rotate: { duration: 16, repeat: Infinity, ease: "linear" }, scale: { duration: 2.4, repeat: Infinity } }}
                />
              </div>
            )}
            <AnimatePresence>
              {battleEffect && (
                <motion.div
                  key={battleEffect.id}
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: reduceMotion ? 1 : 1.3 }}
                  transition={{ duration: reduceMotion ? 0.05 : 0.18 }}
                  className="pointer-events-none absolute inset-x-3 top-5 z-30 flex justify-center"
                  role="status"
                  aria-live="polite"
                >
                  <div className={`-rotate-3 border-4 bg-journey-forest-deep px-6 py-3 text-center text-white shadow-2xl ${battleEffect.type === "correct" ? "border-emerald-400" : battleEffect.type === "timeout" ? "border-journey-gold" : "border-red-400"}`}>
                    <p className="font-jp text-5xl font-black">{battleEffect.type === "correct" ? "命中" : battleEffect.type === "timeout" ? "時間切" : "失敗"}</p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.2em]">
                      {battleEffect.type === "correct" ? "Golpe certeiro" : battleEffect.type === "timeout" ? "Tempo esgotado · combo perdido" : "Combo interrompido"}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="relative rounded-[1.7rem] bg-journey-sand p-5 text-center sm:p-8">
              {session && prompt ? (
                <>
                  <div className="flex items-center justify-between gap-4 text-[10px] font-black uppercase tracking-[0.12em] text-journey-ink/50 sm:text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      {settings.mode === "timed" ? <Clock3 size={14} /> : <Target size={14} />}
                      {settings.mode === "quantity"
                        ? `${session.attempts.length}/${settings.targetCount}`
                        : settings.mode === "timed" && timedRemainingSeconds != null
                          ? formatTimer(timedRemainingSeconds)
                          : `${session.attempts.length} respostas`}
                    </span>
                    <span>Esc encerra</span>
                  </div>

                  {settings.mode === "quantity" && (
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-journey-wood/10" aria-label={`${progress}% concluído`}>
                      <div className="h-full rounded-full bg-journey-orange transition-[width] duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  )}

                  {session.settings.difficulty === "jonin" && (
                    <div className="mt-4">
                      <div className="grid grid-cols-3 gap-2">
                        <MetricCard label="Combo" value={`${advancedCombo}x`} />
                        <MetricCard label="Meta ninja" value={`${advancedStreakGoal}x`} />
                        <MetricCard label="Tempo" value={`${advancedRemainingSeconds ?? 5}s`} icon={<Clock3 size={14} />} />
                      </div>
                      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-journey-wood/10" aria-label={`${advancedRemainingSeconds ?? 5} segundos restantes`}>
                        <motion.div
                          className={`h-full origin-left rounded-full ${advancedTimerProgress <= 30 ? "bg-red-600" : advancedTimerProgress <= 60 ? "bg-journey-orange" : "bg-journey-leaf"}`}
                          style={{ width: `${advancedTimerProgress}%` }}
                          transition={{ duration: 0.05, ease: "linear" }}
                        />
                      </div>
                    </div>
                  )}

                  <motion.div
                    key={prompt.kana.char}
                    initial={reduceMotion ? undefined : { opacity: 0, scale: 0.88 }}
                    animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
                    transition={{ duration: 0.18 }}
                    className="mx-auto mt-7 grid min-h-48 place-items-center rounded-[2rem] border border-journey-wood/10 bg-white px-4 py-7 shadow-inner sm:min-h-60"
                  >
                    <span className="font-jp text-[7rem] font-black leading-none text-journey-ink sm:text-[9rem]">{prompt.kana.char}</span>
                  </motion.div>

                  {session.settings.difficulty === "genin" && (
                    <p className="mb-4 mt-3 text-xs font-bold text-journey-ink/50">Família {prompt.kana.groupTitle}</p>
                  )}
                  {session.settings.difficulty === "jonin" && (
                    <p className={`mb-4 mt-3 text-xs font-extrabold ${advancedCombo >= advancedStreakGoal ? "text-emerald-700" : "text-journey-ink/55"}`}>
                      {advancedCombo >= advancedStreakGoal ? "Meta de combo batida. Continue sem errar." : "Você tem 5 segundos: responda antes que o combo seja quebrado."}
                    </p>
                  )}
                  {session.settings.difficulty === "chunin" && <div className="h-7" />}

                  <label className="block">
                    <span className="sr-only">Digite o romaji correspondente</span>
                    <input
                      ref={inputRef}
                      value={answer}
                      onChange={handleAnswerChange}
                      autoCapitalize="none"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full rounded-2xl border-2 border-journey-forest-deep bg-white px-5 py-4 text-center text-2xl font-black text-journey-ink outline-none transition placeholder:text-journey-ink/25 focus:border-journey-orange focus:ring-4 focus:ring-journey-orange/15"
                      placeholder="romaji"
                    />
                  </label>
                </>
              ) : (
                <div className="py-5 sm:py-8">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-journey-orange text-white shadow-[0_12px_26px_hsl(var(--journey-orange)/.28)]">
                    {finishedSession ? <Trophy size={28} /> : <Zap size={28} fill="currentColor" />}
                  </div>
                  <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-journey-orange">
                    {finishedSession ? "Relatório concluído" : "Próxima missão"}
                  </p>
                  <h2 className="mt-2 font-display text-3xl font-black tracking-[-0.045em] text-journey-ink">
                    {finishedSession ? "Sessão finalizada" : "Pronto para treinar?"}
                  </h2>
                  <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-journey-ink/55">
                    {finishedSession ? "Confira seu desempenho abaixo ou inicie outra rodada." : "Pressione Espaço ou toque no botão para começar."}
                  </p>
                  <button
                    type="button"
                    onClick={startTraining}
                    disabled={deck.length === 0}
                    className="mt-6 inline-flex min-h-14 min-w-52 items-center justify-center gap-2 rounded-2xl bg-journey-orange px-6 text-sm font-black text-white shadow-[0_14px_30px_hsl(var(--journey-orange)/.26)] transition hover:-translate-y-0.5 hover:bg-journey-orange-hover disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                  >
                    <Zap size={17} fill="currentColor" />
                    {finishedSession ? "Treinar novamente" : "Começar teste"}
                  </button>
                </div>
              )}
            </div>
          </section>

          {(lastAttempt || finishedSession) && (
            <section className="rounded-[1.75rem] border border-journey-wood/10 bg-white/70 p-5 shadow-[0_14px_35px_hsl(var(--journey-wood)/.08)] sm:p-6">
              <SectionTitle icon={<ReactionStatsIcon />} eyebrow="Desempenho" title="Resultado da missão" />
              {lastAttempt && <LastAttempt attempt={lastAttempt} />}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <MetricCard label="Respostas" value={`${stats.correct}/${stats.total}`} icon={<Target size={15} />} />
                <MetricCard label="Mais rápido" value={formatMs(stats.fastestCompletionMs)} icon={<Gauge size={15} />} />
              </div>

              {stats.weakKana.length > 0 && (
                <div className="mt-5 border-t border-journey-wood/10 pt-5">
                  <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-journey-orange">
                    <Flame size={14} /> Kana para reforçar
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {stats.weakKana.map((item) => (
                      <span key={`${item.kana}-${item.romaji}`} className="rounded-full border border-journey-wood/10 bg-journey-sand px-3 py-2 text-xs font-extrabold text-journey-ink/70">
                        <span className="mr-1 font-jp text-base text-journey-ink">{item.kana}</span> {item.romaji} · {item.averageCompletionMs}ms
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {session && (
            <button
              type="button"
              onClick={() => finishTraining()}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-journey-wood/15 bg-white/60 px-5 text-xs font-black text-journey-ink/65 transition hover:border-journey-orange/30 hover:bg-white hover:text-journey-orange active:scale-[0.98]"
            >
              <RotateCcw size={15} /> Encerrar sessão
            </button>
          )}
        </motion.div>
      </main>

      <FloatingLearningNav />
    </div>
  );
}

function SectionTitle({ title, eyebrow, icon }: { title: string; eyebrow?: string; icon?: ReactNode }) {
  return (
    <div className="mb-5">
      {eyebrow && <p className="text-[9px] font-black uppercase tracking-[0.18em] text-journey-orange">{eyebrow}</p>}
      <h2 className="mt-1.5 flex items-center gap-2 font-display text-lg font-black tracking-[-0.025em] text-journey-ink">
        {icon}{title}
      </h2>
    </div>
  );
}

function SettingGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-5 first:mt-0">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-journey-wood/60">{label}</p>
      {children}
    </div>
  );
}

function OptionButton({ active, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`${optionBase} ${active ? "border-journey-forest-deep bg-journey-forest-deep text-white shadow-sm" : "border-journey-wood/10 bg-white/65 text-journey-ink/65 hover:border-journey-orange/30 hover:bg-white hover:text-journey-ink"} ${className}`}
    />
  );
}

function MetricCard({ label, value, dark = false, icon }: { label: string; value: string; dark?: boolean; icon?: ReactNode }) {
  return (
    <div className={dark ? "min-w-0 rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-3 sm:min-w-28 sm:px-4" : "rounded-2xl border border-journey-wood/10 bg-white/75 p-3"}>
      <p className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.1em] ${dark ? "text-white/55" : "text-journey-ink/45"}`}>{icon}{label}</p>
      <p className={`mt-1.5 truncate text-base font-black sm:text-lg ${dark ? "text-white" : "text-journey-ink"}`}>{value}</p>
    </div>
  );
}

function LastAttempt({ attempt }: { attempt: KanaReactionAttempt }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${attempt.correct ? "border-emerald-700/15 bg-emerald-50" : "border-red-700/15 bg-red-50"}`}>
      <div>
        <p className={`text-xs font-black ${attempt.correct ? "text-emerald-800" : "text-red-800"}`}>{attempt.correct ? "Correto" : "Revisar"}</p>
        <p className="mt-1 text-xs font-semibold text-journey-ink/50">{getPerformanceLabel(attempt.completionMs)} · reação {formatMs(attempt.reactionMs)}</p>
      </div>
      <div className="shrink-0 font-black text-journey-ink"><span className="mr-1 font-jp text-3xl">{attempt.kana}</span> {attempt.romaji}</div>
    </div>
  );
}
