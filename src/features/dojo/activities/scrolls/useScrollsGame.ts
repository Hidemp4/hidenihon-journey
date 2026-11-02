import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { localDayNumber, systemUtcOffset } from "@/features/dojo/shared/calendar";
import { createId } from "@/features/dojo/shared/ids";
import { getContentGroups, getContentItems } from "@/features/dojo/shared/content";
import { computeWeights, masteryStore, type MasteryItems } from "@/features/dojo/shared/mastery";
import { useArenaAudio } from "@/features/dojo/shared/useArenaAudio";
import { useSaveOnExit } from "@/features/dojo/shared/useSaveOnExit";
import { commitScrollSession } from "./commit";
import { GRADE_OPTIONS } from "./constants";
import { buildFreeQueue, buildReviewQueue, countReviewAvailability } from "./queue";
import { createScrollsState, scrollsReducer } from "./scrollsReducer";
import { loadIntroducedToday, loadScrollsSettings, saveScrollsSettings } from "./scrollsRepository";
import type { ScrollGrade, ScrollsSettings } from "./types";

/** Em cima de um botão, Espaço/Enter já acionam o próprio botão: o atalho global não pode agir junto. */
const INTERACTIVE_SELECTOR = "button, input, textarea, select, a, [contenteditable='true']";

interface StoreSnapshot {
  now: number;
  records: MasteryItems;
  introducedToday: number;
}

/** A agenda muda fora do reducer (ao gravar a sessão): a fila sempre parte de uma leitura nova. */
function readStores(): StoreSnapshot {
  const now = Date.now();
  return {
    now,
    records: masteryStore.getItems(),
    introducedToday: loadIntroducedToday(localDayNumber(now, systemUtcOffset)),
  };
}

export function useScrollsGame() {
  const [state, dispatch] = useReducer(scrollsReducer, undefined, () => createScrollsState(loadScrollsSettings()));
  const [stores, setStores] = useState(readStores);
  const [storageWarning, setStorageWarning] = useState(false);
  const { enabled: audioEnabled, toggle: toggleAudio, playCue } = useArenaAudio();
  const { settings, game } = state;

  const { content, alphabet, selectedGroupIds } = settings;
  const groups = useMemo(() => getContentGroups({ content, alphabet }), [alphabet, content]);
  const items = useMemo(() => getContentItems({ content, alphabet }, selectedGroupIds), [alphabet, content, selectedGroupIds]);
  const availability = useMemo(
    () =>
      countReviewAvailability({
        items,
        records: stores.records,
        now: stores.now,
        newPerDay: settings.newPerDay,
        introducedToday: stores.introducedToday,
      }),
    [items, settings.newPerDay, stores]
  );
  /** Cartas do baralho que já entraram na agenda (passaram por uma revisão). */
  const scheduled = useMemo(() => items.filter((item) => stores.records[item.id]?.dueAt != null).length, [items, stores]);

  const pendingSession = game.screen !== "lobby" && game.session.history.length > 0 ? game.session : null;
  useSaveOnExit(pendingSession, commitScrollSession);

  // ---- ações -------------------------------------------------------------

  /** Grava a sessão pendente (se houver) e relê a agenda. */
  const commitAndRefresh = useCallback(() => {
    if (pendingSession) setStorageWarning(!commitScrollSession(pendingSession));
    const next = readStores();
    setStores(next);
    return next;
  }, [pendingSession]);

  const startReview = useCallback(() => {
    const fresh = commitAndRefresh();
    const cards = buildReviewQueue({
      items,
      records: fresh.records,
      now: fresh.now,
      newPerDay: settings.newPerDay,
      introducedToday: fresh.introducedToday,
    });
    dispatch({ type: "START", id: createId(), mode: "review", cards, now: fresh.now, offsetAt: systemUtcOffset });
  }, [commitAndRefresh, items, settings.newPerDay]);

  const startFree = useCallback(() => {
    const fresh = commitAndRefresh();
    const cards = buildFreeQueue({
      items,
      records: fresh.records,
      weights: computeWeights(fresh.records),
      rng: Math.random,
    });
    dispatch({ type: "START", id: createId(), mode: "free", cards, now: fresh.now, offsetAt: systemUtcOffset });
  }, [commitAndRefresh, items]);

  const currentCard = game.screen === "session" ? game.session.queue[0] ?? null : null;
  const flipped = game.screen === "session" && game.session.flipped;

  const flip = useCallback(() => {
    if (!currentCard || flipped) return;
    dispatch({ type: "FLIP", cardKey: currentCard.key, now: Date.now() });
    void playCue("flip");
  }, [currentCard, flipped, playCue]);

  const grade = useCallback(
    (value: ScrollGrade) => {
      if (!currentCard) return;
      dispatch({ type: "GRADE", cardKey: currentCard.key, grade: value, now: Date.now() });
    },
    [currentCard]
  );

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const finish = useCallback(() => dispatch({ type: "FINISH" }), []);

  const close = useCallback(() => {
    commitAndRefresh();
    dispatch({ type: "CLOSE" });
  }, [commitAndRefresh]);

  const updateSettings = useCallback((patch: Partial<ScrollsSettings>) => dispatch({ type: "UPDATE_SETTINGS", patch }), []);
  const toggleGroup = useCallback((groupId: string) => dispatch({ type: "TOGGLE_GROUP", groupId }), []);

  // ---- efeitos -------------------------------------------------------------

  useEffect(() => {
    saveScrollsSettings(settings);
  }, [settings]);

  // Teclado global: Espaço/Enter vira, 1–3 avaliam, Z desfaz, Esc encerra a sessão.
  const screen = game.screen;
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (screen === "lobby" || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;

      if (event.key === "z" || event.key === "Z") {
        if (event.repeat) return;
        event.preventDefault();
        undo();
        return;
      }

      if (screen !== "session") return;

      if (event.key === "Escape") {
        // Marca o Esc como usado: aqui ele encerra a sessão, não volta ao Dojô.
        event.preventDefault();
        finish();
        return;
      }

      if (event.repeat) return;

      if (event.key === " " || event.key === "Enter") {
        if (event.target instanceof Element && event.target.closest(INTERACTIVE_SELECTOR)) return;
        event.preventDefault();
        flip();
        return;
      }

      const option = GRADE_OPTIONS.find(({ key }) => key === event.key);
      if (option) {
        event.preventDefault();
        grade(option.id);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [finish, flip, grade, screen, undo]);

  return {
    settings,
    game,
    groups,
    availability,
    scheduled,
    now: stores.now,
    storageWarning,
    audioEnabled,
    toggleAudio,
    updateSettings,
    toggleGroup,
    startReview,
    startFree,
    flip,
    grade,
    undo,
    finish,
    close,
  };
}
