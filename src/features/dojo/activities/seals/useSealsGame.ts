import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { createId } from "@/features/dojo/shared/ids";
import { getContentGroups } from "@/features/dojo/shared/content";
import { masteryStore } from "@/features/dojo/shared/mastery";
import { useArenaAudio } from "@/features/dojo/shared/useArenaAudio";
import { useSaveOnExit } from "@/features/dojo/shared/useSaveOnExit";
import { commitSealsGame, hasProgress } from "./commit";
import { MISMATCH_HIDE_MS, WIDE_BOARD_QUERY } from "./constants";
import { buildSealPairs, contentSelection, countDistinctPairs, sealsConfigKey } from "./pairs";
import { elapsedMs } from "./results";
import { createSealsState, sealsReducer } from "./sealsReducer";
import { loadSealsBests, loadSealsSettings, saveSealsSettings } from "./sealsRepository";
import type { SealsBoard, SealsSettings } from "./types";

/** Atualização do cronômetro na tela. O tempo de verdade vem dos `now` das viradas, não daqui. */
const CLOCK_TICK_MS = 250;

function randomSeed() {
  return Math.floor(Math.random() * 2 ** 32);
}

/** Lido só no início da partida: as colunas não mudam mais até o fim (ver `SealsBoard.columns`). */
function isWideViewport() {
  try {
    return typeof window.matchMedia === "function" && window.matchMedia(WIDE_BOARD_QUERY).matches;
  } catch {
    return false;
  }
}

function persistAbandonedBoard(board: SealsBoard) {
  commitSealsGame(board, { finished: false, now: Date.now() });
}

export function useSealsGame() {
  const [state, dispatch] = useReducer(sealsReducer, undefined, () => createSealsState(loadSealsSettings()));
  const [bests, setBests] = useState(loadSealsBests);
  const [storageWarning, setStorageWarning] = useState(false);
  const [clock, setClock] = useState(() => performance.now());
  const { enabled: audioEnabled, toggle: toggleAudio, playCue } = useArenaAudio();
  const { settings, game } = state;

  const { content, alphabet } = contentSelection(settings);
  const groups = useMemo(() => getContentGroups({ content, alphabet }), [alphabet, content]);
  const candidates = useMemo(() => buildSealPairs(settings), [settings]);
  const availablePairs = useMemo(() => countDistinctPairs(candidates), [candidates]);
  const configKey = sealsConfigKey(settings);

  const board = game.screen === "lobby" ? null : game.board;
  const playingBoard = game.screen === "playing" ? game.board : null;

  // ---- ações -------------------------------------------------------------

  const start = useCallback(() => {
    dispatch({
      type: "START",
      id: createId(),
      candidates,
      weights: masteryStore.getWeights(),
      seed: randomSeed(),
      wide: isWideViewport(),
      // Relido do disco: outra aba pode ter batido o recorde desde que esta abriu.
      previousBest: loadSealsBests()[configKey] ?? null,
    });
  }, [candidates, configKey]);

  const flip = useCallback((index: number) => dispatch({ type: "FLIP", index, now: performance.now() }), []);

  const abandon = useCallback(() => {
    if (playingBoard && hasProgress(playingBoard)) persistAbandonedBoard(playingBoard);
    dispatch({ type: "ABANDON" });
  }, [playingBoard]);

  const close = useCallback(() => dispatch({ type: "CLOSE" }), []);
  const updateSettings = useCallback((patch: Partial<SealsSettings>) => dispatch({ type: "UPDATE_SETTINGS", patch }), []);
  const toggleGroup = useCallback((groupId: string) => dispatch({ type: "TOGGLE_GROUP", groupId }), []);

  // ---- efeitos -------------------------------------------------------------

  useEffect(() => {
    saveSealsSettings(settings);
  }, [settings]);

  // Par errado: desvira depois de um tempo. O HIDE leva o id da jogada; se já não for a pendente, é ignorado.
  const pendingMoveId = playingBoard?.pendingMoveId ?? null;
  useEffect(() => {
    if (pendingMoveId == null) return;
    const timeoutId = window.setTimeout(() => dispatch({ type: "HIDE", moveId: pendingMoveId }), MISMATCH_HIDE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [pendingMoveId]);

  // Cronômetro na tela: só corre entre a 1ª virada e o último par.
  const running = playingBoard?.startedAt != null;
  useEffect(() => {
    if (!running) return;
    setClock(performance.now());
    const intervalId = window.setInterval(() => setClock(performance.now()), CLOCK_TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [running]);

  // Som: um por jogada (o objeto do evento só muda quando há uma virada nova; desvirar não toca nada).
  const lastEvent = board?.lastEvent ?? null;
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === "match") {
      void playCue("match");
      void playCue("seal");
    } else {
      void playCue("flip");
    }
  }, [lastEvent, playCue]);

  // Mesa completa: grava domínio e recorde (idempotente: a mesma mesa não conta duas vezes).
  const wonBoard = game.screen === "won" ? game.board : null;
  useEffect(() => {
    if (!wonBoard) return;
    setStorageWarning(!commitSealsGame(wonBoard, { finished: true, now: Date.now() }));
    setBests(loadSealsBests());
  }, [wonBoard]);

  // Sair no meio ("← Dojô", menu, fechar a aba): pares formados e tropeços vão para o domínio.
  useSaveOnExit(playingBoard && hasProgress(playingBoard) ? playingBoard : null, persistAbandonedBoard);

  // Esc na partida encerra (volta ao lobby dos Selos); no lobby e no resultado quem cuida é a casca (volta ao Dojô).
  const playing = game.screen === "playing";
  useEffect(() => {
    if (!playing) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      abandon();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [abandon, playing]);

  return {
    settings,
    game,
    groups,
    availablePairs,
    best: bests[configKey] ?? null,
    elapsedMs: board ? elapsedMs(board, clock) : 0,
    storageWarning,
    audioEnabled,
    toggleAudio,
    updateSettings,
    toggleGroup,
    start,
    flip,
    abandon,
    close,
  };
}
