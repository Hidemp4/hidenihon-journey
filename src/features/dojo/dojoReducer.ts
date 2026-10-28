import { COUNTDOWN_START, DEFAULT_DOJO_SETTINGS } from "./constants";
import { filterKanaDeck } from "./kanaDeck";
import { evaluateAnswer, normalizeAnswer } from "./romaji";
import {
  buildMissWeights,
  createAttempt,
  createPrompt,
  createTimeoutAttempt,
  markFirstKey,
  markShown,
  pickNextKana,
  shouldFinishSession,
  type Stamp,
} from "./sessionEngine";
import type {
  AttemptOutcome,
  DojoAttempt,
  DojoPrompt,
  DojoSession,
  DojoSettings,
} from "./types";

export type GameState =
  | { screen: "intro" }
  | { screen: "lobby" }
  | { screen: "countdown"; count: number }
  | { screen: "training"; session: DojoSession; prompt: DojoPrompt; startedAtPerf: number };

type TrainingState = Extract<GameState, { screen: "training" }>;

export interface BattleEffect {
  id: string;
  type: AttemptOutcome;
  kana: string;
}

export interface DojoState {
  settings: DojoSettings;
  game: GameState;
  lastSession: DojoSession | null;
  /** `true` só para a sessão encerrada nesta visita (a que ainda precisa ser salva). */
  justFinished: boolean;
  effect: BattleEffect | null;
}

export type DojoAction =
  | { type: "ENTER_LOBBY" }
  | { type: "UPDATE_SETTINGS"; patch: Partial<DojoSettings> }
  | { type: "TOGGLE_GROUP"; groupId: string }
  | { type: "BEGIN_COUNTDOWN" }
  | { type: "COUNTDOWN_TICK" }
  | { type: "START_TRAINING"; stamp: Stamp }
  | { type: "PROMPT_SHOWN"; promptId: string; now: number }
  | { type: "ANSWER"; promptId: string; value: string; final: boolean; stamp: Stamp }
  | { type: "TIMEOUT"; promptId: string; stamp: Stamp }
  | { type: "FINISH"; stamp: Stamp }
  | { type: "CLEAR_EFFECT"; id: string };

export function createInitialState(
  options: { settings?: DojoSettings; lastSession?: DojoSession | null } = {}
): DojoState {
  return {
    settings: options.settings ?? { ...DEFAULT_DOJO_SETTINGS, selectedGroupIds: [] },
    game: { screen: "intro" },
    lastSession: options.lastSession ?? null,
    justFinished: false,
    effect: null,
  };
}

function finishSession(
  state: DojoState,
  session: DojoSession,
  stamp: Stamp,
  effect: BattleEffect | null = null
): DojoState {
  // Sessão sem tentativas é descartada: não sobrescreve o último resultado nem vai pro storage.
  if (session.attempts.length === 0) {
    return { ...state, game: { screen: "lobby" }, effect: null };
  }

  return {
    ...state,
    game: { screen: "lobby" },
    lastSession: { ...session, finishedAt: stamp.isoNow },
    justFinished: true,
    effect,
  };
}

function resolveAttempt(
  state: DojoState,
  training: TrainingState,
  attempt: DojoAttempt,
  stamp: Stamp
): DojoState {
  const attempts = [...training.session.attempts, attempt];
  const session: DojoSession = { ...training.session, attempts };
  const effect: BattleEffect = { id: attempt.id, type: attempt.outcome, kana: attempt.kana };

  if (shouldFinishSession(session.settings, attempts.length)) {
    return finishSession(state, session, stamp, effect);
  }

  const deck = filterKanaDeck(session.settings.alphabet, session.settings.selectedGroupIds);
  const nextKana = pickNextKana(
    deck,
    attempts.map((item) => item.kana),
    stamp.random,
    buildMissWeights(attempts)
  );
  if (!nextKana) return finishSession(state, session, stamp, effect);

  return {
    ...state,
    effect,
    game: { ...training, session, prompt: createPrompt(nextKana, stamp.promptId) },
  };
}

export function dojoReducer(state: DojoState, action: DojoAction): DojoState {
  const { game } = state;

  switch (action.type) {
    case "ENTER_LOBBY":
      return game.screen === "intro" ? { ...state, game: { screen: "lobby" } } : state;

    case "UPDATE_SETTINGS": {
      if (game.screen !== "lobby") return state;

      const next = { ...state.settings, ...action.patch };
      const changedAlphabet = action.patch.alphabet !== undefined && action.patch.alphabet !== state.settings.alphabet;
      // Os grupos pertencem ao alfabeto: ao trocar de alfabeto a seleção é limpa.
      if (changedAlphabet && action.patch.selectedGroupIds === undefined) next.selectedGroupIds = [];

      return { ...state, settings: next };
    }

    case "TOGGLE_GROUP": {
      if (game.screen !== "lobby") return state;

      const { selectedGroupIds } = state.settings;
      const nextIds = selectedGroupIds.includes(action.groupId)
        ? selectedGroupIds.filter((id) => id !== action.groupId)
        : [...selectedGroupIds, action.groupId];

      return { ...state, settings: { ...state.settings, selectedGroupIds: nextIds } };
    }

    case "BEGIN_COUNTDOWN": {
      if (game.screen !== "lobby") return state;
      if (filterKanaDeck(state.settings.alphabet, state.settings.selectedGroupIds).length === 0) return state;
      return { ...state, game: { screen: "countdown", count: COUNTDOWN_START } };
    }

    case "COUNTDOWN_TICK":
      if (game.screen !== "countdown" || game.count === 0) return state;
      return { ...state, game: { screen: "countdown", count: game.count - 1 } };

    case "START_TRAINING": {
      if (game.screen !== "countdown") return state;

      const { settings } = state;
      const firstKana = pickNextKana(filterKanaDeck(settings.alphabet, settings.selectedGroupIds), [], action.stamp.random);
      if (!firstKana) return { ...state, game: { screen: "lobby" } };

      const session: DojoSession = {
        id: action.stamp.attemptId,
        settings,
        startedAt: action.stamp.isoNow,
        finishedAt: null,
        attempts: [],
      };

      return {
        ...state,
        justFinished: false,
        effect: null,
        game: {
          screen: "training",
          session,
          prompt: createPrompt(firstKana, action.stamp.promptId),
          startedAtPerf: action.stamp.now,
        },
      };
    }

    case "PROMPT_SHOWN": {
      if (game.screen !== "training" || game.prompt.id !== action.promptId) return state;

      const prompt = markShown(game.prompt, action.now);
      return prompt === game.prompt ? state : { ...state, game: { ...game, prompt } };
    }

    case "ANSWER": {
      // Respostas de um prompt que já foi resolvido (corrida de eventos) são ignoradas.
      if (game.screen !== "training" || game.prompt.id !== action.promptId) return state;

      const value = normalizeAnswer(action.value);
      if (value === "") return state;

      const prompt = markFirstKey(game.prompt, action.stamp.now);
      const status = evaluateAnswer(prompt.kana.romaji, value);

      if (status === "partial" && !action.final) {
        return prompt === game.prompt ? state : { ...state, game: { ...game, prompt } };
      }

      // `final` (Enter) com resposta incompleta conta como erro.
      return resolveAttempt(state, game, createAttempt(prompt, value, action.stamp), action.stamp);
    }

    case "TIMEOUT": {
      if (game.screen !== "training" || game.prompt.id !== action.promptId) return state;
      if (game.session.settings.difficulty !== "jonin") return state;

      return resolveAttempt(state, game, createTimeoutAttempt(game.prompt, action.stamp), action.stamp);
    }

    case "FINISH":
      return game.screen === "training" ? finishSession(state, game.session, action.stamp) : state;

    case "CLEAR_EFFECT":
      return state.effect?.id === action.id ? { ...state, effect: null } : state;

    default:
      return state;
  }
}
