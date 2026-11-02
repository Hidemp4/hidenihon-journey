import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { createId } from "@/features/dojo/shared/ids";
import { getContentGroups, getContentItems } from "@/features/dojo/shared/content";
import { masteryStore } from "@/features/dojo/shared/mastery";
import { useArenaAudio } from "@/features/dojo/shared/useArenaAudio";
import { useSaveOnExit } from "@/features/dojo/shared/useSaveOnExit";
import { commitExamRun } from "./commit";
import { AUTO_ADVANCE_MS } from "./constants";
import { createExamState, examReducer } from "./examReducer";
import { loadExamSettings, loadLastExamResult, saveExamSettings } from "./examRepository";
import type { ExamRun, ExamSettings } from "./types";

/** Em cima de um botão, Enter já aciona o próprio botão: o atalho global não pode agir junto. */
const INTERACTIVE_SELECTOR = "button, input, textarea, select, a, [contenteditable='true']";
const OPTION_KEYS = ["1", "2", "3", "4"];

function randomSeed() {
  return Math.floor(Math.random() * 2 ** 32);
}

function persistAbandonedRun(run: ExamRun) {
  commitExamRun(run, { finished: false, now: Date.now() });
}

export function useExamGame() {
  const [state, dispatch] = useReducer(examReducer, undefined, () => createExamState(loadExamSettings()));
  const [lastResult, setLastResult] = useState(loadLastExamResult);
  const [storageWarning, setStorageWarning] = useState(false);
  const { enabled: audioEnabled, toggle: toggleAudio, playFeedback } = useArenaAudio();
  const { settings, game } = state;

  const { content, alphabet, selectedGroupIds } = settings;
  const groups = useMemo(() => getContentGroups({ content, alphabet }), [alphabet, content]);
  const items = useMemo(() => getContentItems({ content, alphabet }, selectedGroupIds), [alphabet, content, selectedGroupIds]);

  const questionId = game.screen === "lobby" ? null : game.run.question.id;
  const screen = game.screen;

  // ---- ações -------------------------------------------------------------

  const start = useCallback(() => {
    dispatch({ type: "START", id: createId(), items, weights: masteryStore.getWeights(), seed: randomSeed(), now: performance.now() });
  }, [items]);

  const answer = useCallback(
    (optionIndex: number) => {
      if (screen !== "question" || questionId == null) return;
      dispatch({ type: "ANSWER", questionId, optionIndex, now: performance.now() });
    },
    [questionId, screen]
  );

  // Estável de propósito: a barra do Relâmpago reinicia se o callback mudar.
  const timeout = useCallback((id: string) => dispatch({ type: "TIMEOUT", questionId: id, now: performance.now() }), []);

  const next = useCallback(() => {
    if (questionId == null) return;
    dispatch({ type: "NEXT", questionId, seed: randomSeed(), now: performance.now() });
  }, [questionId]);

  const finish = useCallback(() => dispatch({ type: "FINISH" }), []);
  const close = useCallback(() => dispatch({ type: "CLOSE" }), []);
  const reviewMisses = useCallback(
    () => dispatch({ type: "REVIEW_MISSES", id: createId(), seed: randomSeed(), now: performance.now() }),
    []
  );
  const updateSettings = useCallback((patch: Partial<ExamSettings>) => dispatch({ type: "UPDATE_SETTINGS", patch }), []);
  const toggleGroup = useCallback((groupId: string) => dispatch({ type: "TOGGLE_GROUP", groupId }), []);

  // ---- efeitos -------------------------------------------------------------

  useEffect(() => {
    saveExamSettings(settings);
  }, [settings]);

  // Rodada terminada: grava domínio e "última nota" (uma vez por rodada; o id evita contar dobrado).
  const finishedRun = game.screen === "result" ? game.run : null;
  useEffect(() => {
    if (!finishedRun) return;
    setStorageWarning(!commitExamRun(finishedRun, { finished: true, now: Date.now() }));
    setLastResult(loadLastExamResult());
  }, [finishedRun]);

  // Sair no meio ("← Dojô", menu, fechar a aba): o que já foi respondido vai para o domínio.
  const abandonedRun = (game.screen === "question" || game.screen === "feedback") && game.run.answers.length > 0 ? game.run : null;
  useSaveOnExit(abandonedRun, persistAbandonedRun);

  // Som do feedback: uma vez por resposta (o objeto da resposta só muda quando há uma nova).
  const lastAnswer = game.screen === "feedback" ? game.run.answers[game.run.answers.length - 1] : null;
  useEffect(() => {
    if (lastAnswer) void playFeedback(lastAnswer.outcome);
  }, [lastAnswer, playFeedback]);

  // Avanço automático (configurável). O NEXT leva o id da questão: se a pessoa já avançou, é ignorado.
  const autoAdvanceMs =
    game.screen === "feedback" && game.run.autoAdvance && lastAnswer
      ? lastAnswer.outcome === "correct"
        ? AUTO_ADVANCE_MS.correct
        : AUTO_ADVANCE_MS.wrong
      : null;
  useEffect(() => {
    if (autoAdvanceMs == null || questionId == null) return;
    const timeoutId = window.setTimeout(
      () => dispatch({ type: "NEXT", questionId, seed: randomSeed(), now: performance.now() }),
      autoAdvanceMs
    );
    return () => window.clearTimeout(timeoutId);
  }, [autoAdvanceMs, questionId]);

  // Teclado global: 1–4 respondem, Enter avança, Esc encerra a rodada.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (screen === "lobby" || screen === "result") return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;

      if (event.key === "Escape") {
        // Marca o Esc como usado: aqui ele encerra a rodada, não volta ao Dojô.
        event.preventDefault();
        finish();
        return;
      }

      if (event.repeat) return;

      if (screen === "question") {
        const index = OPTION_KEYS.indexOf(event.key);
        if (index >= 0) {
          event.preventDefault();
          answer(index);
        }
        return;
      }

      if (event.key === "Enter") {
        if (event.target instanceof Element && event.target.closest(INTERACTIVE_SELECTOR)) return;
        event.preventDefault();
        next();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [answer, finish, next, screen]);

  return {
    settings,
    game,
    groups,
    deckSize: items.length,
    lastResult,
    storageWarning,
    audioEnabled,
    toggleAudio,
    updateSettings,
    toggleGroup,
    start,
    answer,
    timeout,
    next,
    finish,
    close,
    reviewMisses,
  };
}
