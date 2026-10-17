import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import { RotateCcw, Settings2, Trophy, Zap } from "lucide-react";
import { FloatingLearningNav, ReactionStatsIcon } from "@/components/navigation/FloatingLearningNav";
import { filterKanaDeck, getAvailableGroups, type KanaAlphabet } from "./kanaDeck";
import { calculateKanaReactionStats, getPerformanceLabel } from "./metrics";
import { loadLocalKanaReactionSessions, saveLocalKanaReactionSession } from "./localRepository";
import {
  createAttempt,
  createPrompt,
  DEFAULT_REACTION_SETTINGS,
  markFirstKey,
  pickNextKana,
  shouldFinishSession,
} from "./sessionEngine";
import type { KanaReactionAttempt, KanaReactionDifficulty, KanaReactionPrompt, KanaReactionSession, KanaReactionSettings } from "./types";
import { FONT_JP, FONT_SANS, t } from "@/pages/Theme";

const buttonBase = {
  border: `1px solid ${t.border}`,
  borderRadius: 999,
  padding: "10px 12px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
} as const;

const difficultyOptions: Array<{ id: KanaReactionDifficulty; label: string; description: string }> = [
  { id: "genin", label: "Iniciante", description: "Mostra a família do kana." },
  { id: "chunin", label: "Intermediário", description: "Remove a dica da família." },
  { id: "jonin", label: "Avançado", description: "Sem dica e com pressão de combo." },
];

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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const finishedTimedSessionIdRef = useRef<string | null>(null);
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
    const nextAttempts = [...session.attempts, attempt];
    const nextSession = { ...session, attempts: nextAttempts };

    if (shouldFinishSession(settings, nextAttempts.length)) {
      finishTraining(nextSession);
      return;
    }

    const recentKana = nextAttempts.map((item) => item.kana);
    const nextKana = pickNextKana(deck, recentKana, settings.focusMode);
    if (!nextKana) return;

    setSession(nextSession);
    setPrompt(createPrompt(nextKana));
    setAnswer("");
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

  return (
    <div onKeyDown={handleKeyDown} style={{ minHeight: "100vh", background: t.surface, fontFamily: FONT_SANS, paddingBottom: 104 }}>
      <div style={{ background: t.primary, borderBottom: `1px solid ${t.border}`, padding: "32px 18px 24px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <div>
              <p style={{ margin: 0, color: t.accent, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.16em" }}>Reaction Time</p>
              <h1 style={{ margin: "5px 0 0", color: t.secondary, fontSize: 26, letterSpacing: "-0.04em" }}>Treino de velocidade</h1>
              <p style={{ margin: "6px 0 0", color: t.muted, fontSize: 13 }}>Reconheça o kana e digite o romaji o mais rápido possível.</p>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: 18, background: t.secondary, color: t.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={24} />
            </div>
          </div>

          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            <MetricCard label="Acerto" value={`${stats.accuracy}%`} />
            <MetricCard label="Média" value={formatMs(stats.averageCompletionMs)} />
            <MetricCard label="Mediana" value={formatMs(stats.medianCompletionMs)} />
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "18px 16px", display: "grid", gap: 14 }}>
        {!settings.focusMode && !session && (
          <section style={cardStyle}>
            <SectionTitle icon={<Settings2 size={16} />} title="Configurar sessão" />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {(["hiragana", "katakana", "mixed"] as KanaAlphabet[]).map((alphabet) => (
                <button key={alphabet} type="button" onClick={() => updateSettings({ alphabet, selectedGroupIds: [] })} style={optionStyle(settings.alphabet === alphabet)}>
                  {alphabet === "mixed" ? "Ambos" : alphabet === "hiragana" ? "Hiragana" : "Katakana"}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {difficultyOptions.map((difficulty) => (
                <button key={difficulty.id} type="button" title={difficulty.description} aria-label={`${difficulty.label}: ${difficulty.description}`} onClick={() => updateSettings({ difficulty: difficulty.id })} style={optionStyle(settings.difficulty === difficulty.id)}>
                  {difficulty.label}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              <button type="button" onClick={() => updateSettings({ mode: "quantity" })} style={optionStyle(settings.mode === "quantity")}>Por quantidade</button>
              <button type="button" onClick={() => updateSettings({ mode: "timed" })} style={optionStyle(settings.mode === "timed")}>Por tempo</button>
              <button type="button" onClick={() => updateSettings({ mode: "free" })} style={optionStyle(settings.mode === "free")}>Livre</button>
            </div>

            {settings.mode === "timed" && (
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {[30, 60, 180, 300].map((timeLimitSeconds) => (
                  <button key={timeLimitSeconds} type="button" onClick={() => updateSettings({ timeLimitSeconds })} style={optionStyle(settings.timeLimitSeconds === timeLimitSeconds)}>{formatDuration(timeLimitSeconds)}</button>
                ))}
              </div>
            )}

            {settings.mode === "quantity" && (
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[10, 20, 50].map((targetCount) => (
                  <button key={targetCount} type="button" onClick={() => updateSettings({ targetCount })} style={optionStyle(settings.targetCount === targetCount)}>{targetCount} kana</button>
                ))}
              </div>
            )}

            <label style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 12, fontWeight: 800, color: t.secondary }}>
              Focus mode
              <input type="checkbox" checked={settings.focusMode} onChange={(event) => updateSettings({ focusMode: event.target.checked })} />
            </label>
          </section>
        )}

        {!settings.focusMode && !session && (
          <section style={cardStyle}>
            <SectionTitle title="Grupos de kana" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button type="button" onClick={() => updateSettings({ selectedGroupIds: [] })} style={optionStyle(settings.selectedGroupIds.length === 0)}>Todos</button>
              {groups.map((group) => (
                <button key={group.id} type="button" onClick={() => toggleGroup(group.id)} style={optionStyle(settings.selectedGroupIds.includes(group.id))}>{group.title.split(" ")[0]}</button>
              ))}
            </div>
          </section>
        )}

        <section style={{ ...cardStyle, textAlign: "center", padding: 22 }}>
          {session && prompt ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: t.muted, fontSize: 12, fontWeight: 800 }}>
                <span>
                  {settings.mode === "quantity"
                    ? `${session.attempts.length}/${settings.targetCount}`
                    : settings.mode === "timed" && timedRemainingSeconds != null
                      ? formatTimer(timedRemainingSeconds)
                      : `${session.attempts.length} respostas`}
                </span>
                <span>Esc encerra</span>
              </div>
              {settings.mode === "quantity" && <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}><div style={{ height: "100%", width: `${progress}%`, borderRadius: 999, background: t.accent }} /></div>}
              {session.settings.difficulty === "jonin" && (
                <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  <MetricCard label="Combo" value={`${advancedCombo}x`} />
                  <MetricCard label="Meta ninja" value={`${advancedStreakGoal}x`} />
                </div>
              )}
              <div style={{ marginTop: 22, fontFamily: FONT_JP, fontSize: 116, lineHeight: 1, color: t.secondary }}>{prompt.kana.char}</div>
              {session.settings.difficulty === "genin" && <p style={{ margin: "8px 0 16px", color: t.muted, fontSize: 12, fontWeight: 700 }}>{prompt.kana.groupTitle}</p>}
              {session.settings.difficulty === "jonin" && <p style={{ margin: "8px 0 16px", color: advancedCombo >= advancedStreakGoal ? "#187C45" : t.muted, fontSize: 12, fontWeight: 800 }}>{advancedCombo >= advancedStreakGoal ? "Meta de combo batida. Continue sem errar." : "Sem dica: mantenha a sequência correta para bater a meta."}</p>}
              {session.settings.difficulty === "chunin" && <div style={{ height: 36 }} />}
              <input ref={inputRef} value={answer} onChange={handleAnswerChange} autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} style={{ width: "100%", border: `2px solid ${t.secondary}`, borderRadius: 18, padding: "16px 18px", fontSize: 24, fontWeight: 900, textAlign: "center", outline: "none", background: t.primary }} placeholder="romaji" />
            </>
          ) : (
            <>
              <div style={{ width: 58, height: 58, borderRadius: 22, background: t.secondary, color: t.primary, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Trophy size={26} /></div>
              <h2 style={{ margin: "14px 0 6px", color: t.secondary, fontSize: 22, letterSpacing: "-0.03em" }}>{finishedSession ? "Sessão finalizada" : "Pronto para treinar"}</h2>
              <p style={{ margin: "0 auto", maxWidth: 340, color: t.muted, fontSize: 13 }}>{finishedSession ? "Veja o resumo abaixo ou comece outra rodada." : "Pressione Space ou toque no botão para iniciar."}</p>
              <button type="button" onClick={startTraining} disabled={deck.length === 0} style={{ ...buttonBase, marginTop: 18, background: t.secondary, color: t.primary, borderColor: t.secondary, minWidth: 190 }}>{finishedSession ? "Treinar novamente" : "Começar teste"}</button>
            </>
          )}
        </section>

        {(lastAttempt || finishedSession) && (
          <section style={cardStyle}>
            <SectionTitle icon={<ReactionStatsIcon />} title="Resultado" />
            {lastAttempt && <LastAttempt attempt={lastAttempt} />}
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              <MetricCard label="Respostas" value={`${stats.correct}/${stats.total}`} />
              <MetricCard label="Mais rápido" value={formatMs(stats.fastestCompletionMs)} />
            </div>
            {stats.weakKana.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: t.muted }}>Kana para reforçar</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {stats.weakKana.map((item) => (
                    <span key={`${item.kana}-${item.romaji}`} style={{ border: `1px solid ${t.border}`, borderRadius: 999, padding: "7px 10px", background: t.surface, fontSize: 12, fontWeight: 800 }}>
                      <span style={{ fontFamily: FONT_JP, fontSize: 17 }}>{item.kana}</span> {item.romaji} · {item.averageCompletionMs}ms
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {session && (
          <button type="button" onClick={() => finishTraining()} style={{ ...buttonBase, background: t.primary, color: t.secondary }}>
            <RotateCcw size={15} style={{ verticalAlign: "-3px", marginRight: 6 }} /> Encerrar sessão
          </button>
        )}
      </main>

      <FloatingLearningNav />
    </div>
  );
}

function SectionTitle({ title, icon }: { title: string; icon?: ReactNode }) {
  return <h2 style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8, color: t.secondary, fontSize: 14, letterSpacing: "-0.01em" }}>{icon}{title}</h2>;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: `1px solid ${t.border}`, borderRadius: 16, background: "rgba(255,255,255,0.7)", padding: "11px 12px" }}>
      <p style={{ margin: 0, color: t.muted, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</p>
      <p style={{ margin: "4px 0 0", color: t.secondary, fontSize: 18, fontWeight: 900 }}>{value}</p>
    </div>
  );
}

function LastAttempt({ attempt }: { attempt: KanaReactionAttempt }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, border: `1px solid ${attempt.correct ? "rgba(24,124,69,0.3)" : "rgba(180,35,24,0.3)"}`, borderRadius: 18, background: attempt.correct ? "rgba(24,124,69,0.08)" : "rgba(180,35,24,0.08)", padding: 12 }}>
      <div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: attempt.correct ? "#187C45" : "#B42318" }}>{attempt.correct ? "Correto" : "Revisar"}</p>
        <p style={{ margin: "3px 0 0", color: t.muted, fontSize: 12 }}>{getPerformanceLabel(attempt.completionMs)} · reação {formatMs(attempt.reactionMs)}</p>
      </div>
      <div style={{ fontWeight: 900, color: t.secondary }}><span style={{ fontFamily: FONT_JP, fontSize: 28 }}>{attempt.kana}</span> {attempt.romaji}</div>
    </div>
  );
}

const cardStyle = {
  border: `1px solid ${t.border}`,
  borderRadius: 24,
  background: t.primary,
  boxShadow: "0 12px 26px rgba(0,0,0,0.06)",
  padding: 16,
} as const;

function optionStyle(active: boolean) {
  return {
    ...buttonBase,
    background: active ? t.secondary : t.primary,
    color: active ? t.primary : t.secondary,
    borderColor: active ? t.secondary : t.border,
  } as const;
}
