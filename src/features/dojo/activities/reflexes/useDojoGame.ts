import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { filterKanaDeck, getAvailableGroups } from "@/features/dojo/shared/kanaDeck";
import { recordActivity } from "@/features/dojo/shared/activityLog";
import { masteryStore } from "@/features/dojo/shared/mastery";
import { useArenaAudio } from "@/features/dojo/shared/useArenaAudio";
import { useSaveOnExit } from "@/features/dojo/shared/useSaveOnExit";
import {
  BATTLE_START_DELAY_MS,
  COUNTDOWN_GO_MS,
  COUNTDOWN_STEP_MS,
  ENTER_ARENA_DELAY_MS,
  FEEDBACK_DURATION_MS,
  LOBBY_MUSIC_DELAY_MS,
} from "./constants";
import {
  loadLocalDojoSessions,
  loadLocalSettings,
  saveLocalDojoSession,
  saveLocalSettings,
} from "./localRepository";
import { attemptsToMasteryResults } from "./masteryResults";
import { calculateDojoStats } from "./metrics";
import { createInitialState, dojoReducer } from "./dojoReducer";
import { createStamp, masteryWeightsForDeck } from "./sessionEngine";
import type { DojoAttempt, DojoSession, DojoSettings } from "./types";

const NO_ATTEMPTS: readonly DojoAttempt[] = [];

/**
 * Grava uma sessão encerrada no histórico da Arena e no domínio compartilhado.
 * Retorna `false` se o histórico não coube (o domínio falha em silêncio: o aviso da tela é só sobre o histórico).
 */
function persistFinishedSession(session: DojoSession): boolean {
  const saved = saveLocalDojoSession(session);

  // O id da sessão evita contar as mesmas respostas duas vezes no domínio por kana.
  const finishedAt = Date.parse(session.finishedAt ?? "");
  masteryStore.recordResults(attemptsToMasteryResults(session.attempts), {
    sourceId: session.id,
    now: Number.isFinite(finishedAt) ? finishedAt : undefined,
  });
  // Sequência e missão do dia: kana respondidos (o aviso de armazenamento continua sendo só o do histórico).
  recordActivity("reflexes", session.attempts.length, { sourceId: session.id, now: Number.isFinite(finishedAt) ? finishedAt : Date.now() });

  return saved;
}

function persistInterruptedSession(session: DojoSession) {
  persistFinishedSession({ ...session, finishedAt: new Date().toISOString() });
}
/** Espaço em cima de botões/inputs deve acionar o próprio controle, não iniciar a batalha. */
const INTERACTIVE_SELECTOR = "button, input, textarea, select, a, [contenteditable='true']";

export function useDojoGame() {
  const [state, dispatch] = useReducer(dojoReducer, undefined, () =>
    createInitialState({
      settings: loadLocalSettings(),
      lastSession: loadLocalDojoSessions()[0] ?? null,
    })
  );
  const [storageWarning, setStorageWarning] = useState(false);
  /** `true` entre o clique em "Entrar na arena" e a abertura do lobby. */
  const [entering, setEntering] = useState(false);
  const enterTimeoutRef = useRef<number | null>(null);
  /** `true` entre o clique em "Iniciar batalha" e a abertura da contagem regressiva. */
  const [starting, setStarting] = useState(false);
  const startTimeoutRef = useRef<number | null>(null);
  const {
    enabled: audioEnabled,
    toggle: toggleAudio,
    unlock: unlockAudio,
    startLobbyMusic,
    stopLobbyMusic,
    playYooo,
    playCountdownBeat,
    playFeedback,
  } = useArenaAudio();

  const { game: phase, settings, lastSession, justFinished, effect } = state;
  const screen = phase.screen;

  const groups = useMemo(() => getAvailableGroups(settings.alphabet), [settings.alphabet]);
  const deckSize = useMemo(
    () => filterKanaDeck(settings.alphabet, settings.selectedGroupIds).length,
    [settings.alphabet, settings.selectedGroupIds]
  );

  const statsAttempts = phase.screen === "training" ? phase.session.attempts : (lastSession?.attempts ?? NO_ATTEMPTS);
  const stats = useMemo(() => calculateDojoStats(statsAttempts), [statsAttempts]);

  // ---- ações -------------------------------------------------------------

  const enterLobby = useCallback(() => {
    if (enterTimeoutRef.current != null) return; // clique duplo durante a espera

    // O áudio dispara já no clique (os navegadores só liberam som após um gesto do usuário)...
    void unlockAudio();
    void startLobbyMusic(LOBBY_MUSIC_DELAY_MS); // começa muda e solta o som após o atraso
    void playYooo();

    // ...e o lobby abre depois de um instante, para a transição casar com o áudio.
    // Com o áudio desligado não há o que esperar.
    if (!audioEnabled) {
      dispatch({ type: "ENTER_LOBBY" });
      return;
    }

    setEntering(true);
    enterTimeoutRef.current = window.setTimeout(() => {
      enterTimeoutRef.current = null;
      setEntering(false);
      dispatch({ type: "ENTER_LOBBY" });
    }, ENTER_ARENA_DELAY_MS);
  }, [audioEnabled, playYooo, startLobbyMusic, unlockAudio]);

  const updateSettings = useCallback((patch: Partial<DojoSettings>) => {
    dispatch({ type: "UPDATE_SETTINGS", patch });
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    dispatch({ type: "TOGGLE_GROUP", groupId });
  }, []);

  const prepareBattle = useCallback(() => {
    if (screen !== "lobby" || deckSize === 0) return;
    if (startTimeoutRef.current != null) return; // clique/Espaço repetido durante a espera

    stopLobbyMusic();
    void playYooo();

    // A tela só troca depois de um instante, para a transição casar com o áudio.
    if (!audioEnabled) {
      dispatch({ type: "BEGIN_COUNTDOWN" });
      return;
    }

    setStarting(true);
    startTimeoutRef.current = window.setTimeout(() => {
      startTimeoutRef.current = null;
      setStarting(false);
      dispatch({ type: "BEGIN_COUNTDOWN" });
    }, BATTLE_START_DELAY_MS);
  }, [audioEnabled, deckSize, playYooo, screen, stopLobbyMusic]);

  const finishTraining = useCallback(() => {
    dispatch({ type: "FINISH", stamp: createStamp() });
  }, []);

  const markPromptShown = useCallback((promptId: string, now: number) => {
    dispatch({ type: "PROMPT_SHOWN", promptId, now });
  }, []);

  const submitAnswer = useCallback((promptId: string, value: string, final = false) => {
    dispatch({ type: "ANSWER", promptId, value, final, stamp: createStamp() });
  }, []);

  const timeoutPrompt = useCallback((promptId: string) => {
    dispatch({ type: "TIMEOUT", promptId, stamp: createStamp() });
  }, []);

  // ---- efeitos colaterais ------------------------------------------------

  useEffect(
    () => () => {
      if (enterTimeoutRef.current != null) window.clearTimeout(enterTimeoutRef.current);
      if (startTimeoutRef.current != null) window.clearTimeout(startTimeoutRef.current);
    },
    []
  );

  // Contagem regressiva: um timer por passo; ao chegar em GO!, inicia o treino.
  const countdownValue = phase.screen === "countdown" ? phase.count : null;
  useEffect(() => {
    if (countdownValue === null) return;

    void playCountdownBeat(countdownValue === 0);
    const timeoutId = window.setTimeout(
      () => {
        dispatch(
          countdownValue === 0
            ? {
                type: "START_TRAINING",
                stamp: createStamp(),
                // Pesos persistidos: o kana que a pessoa erra em qualquer atividade aparece mais aqui também.
                masteryWeights: masteryWeightsForDeck(filterKanaDeck(settings.alphabet, settings.selectedGroupIds), masteryStore.getWeights()),
              }
            : { type: "COUNTDOWN_TICK" }
        );
      },
      countdownValue === 0 ? COUNTDOWN_GO_MS : COUNTDOWN_STEP_MS
    );

    return () => window.clearTimeout(timeoutId);
    // As configurações não mudam durante a contagem (só no lobby): estão aqui só para o "GO!" ler as atuais.
  }, [countdownValue, playCountdownBeat, settings.alphabet, settings.selectedGroupIds]);

  // Música do lobby: o cleanup garante que nunca sobram dois loops.
  useEffect(() => {
    if (screen !== "lobby" || !audioEnabled || starting) return;

    void startLobbyMusic();
    return () => stopLobbyMusic();
  }, [audioEnabled, screen, starting, startLobbyMusic, stopLobbyMusic]);

  // Fim automático do modo "Tempo".
  const trainingSessionId = phase.screen === "training" ? phase.session.id : null;
  const timedEndsAt =
    phase.screen === "training" && phase.session.settings.mode === "timed"
      ? phase.startedAtPerf + phase.session.settings.timeLimitSeconds * 1000
      : null;
  useEffect(() => {
    if (trainingSessionId == null || timedEndsAt == null) return;

    const timeoutId = window.setTimeout(
      () => dispatch({ type: "FINISH", stamp: createStamp() }),
      Math.max(0, timedEndsAt - performance.now())
    );

    return () => window.clearTimeout(timeoutId);
  }, [trainingSessionId, timedEndsAt]);

  // Teclado global: não depende de nenhum elemento estar com foco.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && screen === "training") {
        // Marca o Esc como usado: a casca da atividade não pode tratá-lo também como "voltar ao Dojô".
        event.preventDefault();
        finishTraining();
        return;
      }

      if (event.code === "Space" && screen === "lobby" && !event.repeat) {
        if (event.target instanceof Element && event.target.closest(INTERACTIVE_SELECTOR)) return;
        event.preventDefault();
        prepareBattle();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [finishTraining, prepareBattle, screen]);

  // Salva a sessão encerrada (uma única vez por id).
  useEffect(() => {
    if (!lastSession || !justFinished) return;
    setStorageWarning(!persistFinishedSession(lastSession));
  }, [lastSession, justFinished]);

  // Sair no meio da batalha ("← Dojô", menu, voltar, fechar a aba) não passa pelo FINISH: grava o que já foi respondido.
  const interruptedSession = phase.screen === "training" && phase.session.attempts.length > 0 ? phase.session : null;
  useSaveOnExit(interruptedSession, persistInterruptedSession);

  useEffect(() => {
    saveLocalSettings(settings);
  }, [settings]);

  // Feedback do último golpe: som + remoção do banner.
  useEffect(() => {
    if (!effect) return;

    void playFeedback(effect.type);
    const timeoutId = window.setTimeout(() => dispatch({ type: "CLEAR_EFFECT", id: effect.id }), FEEDBACK_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [effect, playFeedback]);

  return {
    phase,
    settings,
    groups,
    deckSize,
    stats,
    lastSession,
    justFinished,
    effect,
    audioEnabled,
    storageWarning,
    entering,
    starting,
    toggleAudio,
    enterLobby,
    updateSettings,
    toggleGroup,
    prepareBattle,
    finishTraining,
    markPromptShown,
    submitAnswer,
    timeoutPrompt,
  };
}
