import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { createRng } from "@/features/dojo/shared/components/arena/rng";
import { createId } from "@/features/dojo/shared/ids";
import { getContentGroups, getContentItems, type StudyContent } from "@/features/dojo/shared/content";
import { masteryStore } from "@/features/dojo/shared/mastery";
import { useArenaAudio } from "@/features/dojo/shared/useArenaAudio";
import { useSaveOnExit } from "@/features/dojo/shared/useSaveOnExit";
import { countPracticed } from "./badge";
import { brushReducer, createBrushState, currentCard } from "./brushReducer";
import { loadBrushSettings, loadPracticed, saveBrushSettings } from "./brushRepository";
import { commitBrushSession, hasProgress } from "./commit";
import { SELF_GRADE_OPTIONS } from "./constants";
import { buildBrushCards, withGlyphs } from "./queue";
import { loadStrokeSet, type StrokeSet } from "./strokeData";
import type { BrushSession, BrushSettings, DrawnStroke, SelfGrade } from "./types";

/** Em cima de um botão, Enter já aciona o próprio botão: o atalho global não pode agir junto. */
const INTERACTIVE_SELECTOR = "button, input, textarea, select, a, [contenteditable='true']";

function randomSeed() {
  return Math.floor(Math.random() * 2 ** 32);
}

function persistSession(session: BrushSession) {
  commitBrushSession(session, Date.now());
}

export function useBrushGame() {
  const [state, dispatch] = useReducer(brushReducer, undefined, () => createBrushState(loadBrushSettings()));
  const [strokeSets, setStrokeSets] = useState<Partial<Record<StudyContent, StrokeSet>>>({});
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [practiced, setPracticed] = useState(loadPracticed);
  const [storageWarning, setStorageWarning] = useState(false);
  const { enabled: audioEnabled, toggle: toggleAudio, playCue, playFeedback } = useArenaAudio();
  const { settings, game } = state;
  const { content, alphabet, selectedGroupIds } = settings;
  const strokeSet = strokeSets[content] ?? null;

  // Traços sob demanda: cada conteúdo é um chunk próprio, baixado só quando é escolhido.
  useEffect(() => {
    let active = true;
    setLoadFailed(false);
    loadStrokeSet(content).then(
      (set) => {
        if (active) setStrokeSets((current) => ({ ...current, [content]: set }));
      },
      () => {
        if (active) setLoadFailed(true);
      }
    );
    return () => {
      active = false;
    };
  }, [content, loadAttempt]);

  const groups = useMemo(() => getContentGroups({ content, alphabet }), [alphabet, content]);
  const items = useMemo(() => getContentItems({ content, alphabet }, selectedGroupIds), [alphabet, content, selectedGroupIds]);
  const deckSize = strokeSet ? withGlyphs(items, strokeSet.glyphs).length : items.length;

  const session = game.screen === "lobby" ? null : game.session;
  const activeSession = game.screen === "session" ? game.session : null;
  const card = activeSession ? (currentCard(activeSession) ?? null) : null;
  const cardKey = card?.key ?? null;

  // ---- ações -------------------------------------------------------------

  const start = useCallback(() => {
    if (!strokeSet) return;
    const id = createId();
    const cards = buildBrushCards({
      sessionId: id,
      mode: settings.mode,
      items,
      glyphs: strokeSet.glyphs,
      size: settings.sessionSize,
      weights: masteryStore.getWeights(),
      rng: createRng(randomSeed()),
    });
    dispatch({ type: "START", id, cards });
  }, [items, settings.mode, settings.sessionSize, strokeSet]);

  /** A chave vem de quem desenhou (o canvas é remontado a cada kana): traço de carta antiga é ignorado. */
  const stroke = useCallback((key: string, points: DrawnStroke) => dispatch({ type: "STROKE", cardKey: key, points }), []);

  /** Ações da carta atual: levam a chave dela, então um clique atrasado numa carta que já saiu é ignorado. */
  const dispatchForCard = useCallback(
    (type: "UNDO" | "CLEAR" | "CHECK" | "NEXT" | "PREV" | "SKIP") => {
      if (cardKey) dispatch({ type, cardKey });
    },
    [cardKey]
  );

  const undo = useCallback(() => dispatchForCard("UNDO"), [dispatchForCard]);
  const clear = useCallback(() => dispatchForCard("CLEAR"), [dispatchForCard]);
  const check = useCallback(() => dispatchForCard("CHECK"), [dispatchForCard]);
  const next = useCallback(() => dispatchForCard("NEXT"), [dispatchForCard]);
  const prev = useCallback(() => dispatchForCard("PREV"), [dispatchForCard]);
  const skip = useCallback(() => dispatchForCard("SKIP"), [dispatchForCard]);
  const grade = useCallback(
    (value: SelfGrade) => {
      if (cardKey) dispatch({ type: "GRADE", cardKey, grade: value });
    },
    [cardKey]
  );

  const finish = useCallback(() => dispatch({ type: "FINISH" }), []);
  const close = useCallback(() => dispatch({ type: "CLOSE" }), []);
  const retryLoad = useCallback(() => setLoadAttempt((attempt) => attempt + 1), []);
  const updateSettings = useCallback((patch: Partial<BrushSettings>) => dispatch({ type: "UPDATE_SETTINGS", patch }), []);
  const toggleGroup = useCallback((groupId: string) => dispatch({ type: "TOGGLE_GROUP", groupId }), []);

  // ---- efeitos -------------------------------------------------------------

  useEffect(() => {
    saveBrushSettings(settings);
  }, [settings]);

  // Som do retorno de cada traço (o objeto só muda quando um traço novo é conferido).
  const feedback = activeSession?.feedback ?? null;
  const strokesInCard = card?.glyph.strokes.length ?? 0;
  useEffect(() => {
    if (!feedback) return;
    if (feedback.verdict.kind !== "ok") void playFeedback("wrong");
    else void playCue(feedback.strokeIndex + 1 === strokesInCard ? "match" : "flip");
  }, [feedback, playCue, playFeedback, strokesInCard]);

  // Resumo: grava domínio e praticados (idempotente pelo id da sessão).
  const finishedSession = game.screen === "summary" ? game.session : null;
  useEffect(() => {
    if (!finishedSession) return;
    setStorageWarning(!commitBrushSession(finishedSession, Date.now(), { finished: true }));
    setPracticed(loadPracticed());
  }, [finishedSession]);

  // Sair no meio ("← Dojô", menu, fechar a aba): os kana já avaliados vão para o domínio.
  useSaveOnExit(activeSession && hasProgress(activeSession) ? activeSession : null, persistSession);

  // Teclado: Esc encerra, Z desfaz, Enter confere/avança, 1–3 avaliam, setas no Estudar ordem.
  const mode = activeSession?.mode ?? null;
  const phase = activeSession?.phase ?? null;
  useEffect(() => {
    if (!mode) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.isComposing || event.altKey) return;
      const onInteractive = event.target instanceof Element && event.target.closest(INTERACTIVE_SELECTOR) != null;

      if (event.key === "Escape") {
        if (event.ctrlKey || event.metaKey) return;
        // Marca o Esc como usado: aqui ele encerra a sessão, não volta ao Dojô.
        event.preventDefault();
        finish();
        return;
      }

      // Z ou Ctrl/Cmd+Z: desfaz o último traço (Shift+Z fica livre para o "refazer" do navegador).
      if ((event.key === "z" || event.key === "Z") && !event.shiftKey && mode !== "study") {
        event.preventDefault();
        undo();
        return;
      }

      if (event.ctrlKey || event.metaKey || event.repeat) return;

      if (mode === "study" && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
        event.preventDefault();
        (event.key === "ArrowRight" ? next : prev)();
        return;
      }

      if (mode === "recall" && phase === "checked") {
        const option = SELF_GRADE_OPTIONS.find(({ key }) => key === event.key);
        if (option) {
          event.preventDefault();
          grade(option.id);
          return;
        }
      }

      if (event.key === "Enter" && !onInteractive) {
        event.preventDefault();
        if (mode === "recall" && phase === "drawing") check();
        else next();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [check, finish, grade, mode, next, phase, prev, undo]);

  return {
    settings,
    game,
    session,
    card,
    groups,
    deckSize,
    strokeSet,
    loadFailed,
    /** Praticados do conteúdo escolhido no lobby (kana ou kanji). */
    practicedCount: countPracticed(practiced, content),
    practicedTotal: Object.keys(practiced).length,
    storageWarning,
    audioEnabled,
    toggleAudio,
    updateSettings,
    toggleGroup,
    retryLoad,
    start,
    stroke,
    undo,
    clear,
    check,
    grade,
    next,
    prev,
    skip,
    finish,
    close,
  };
}
