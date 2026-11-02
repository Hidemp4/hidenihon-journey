import type { UtcOffsetFn } from "@/features/dojo/shared/calendar";
import { groupsKey } from "@/features/dojo/shared/content";
import { toggleGroupSelection } from "@/features/dojo/shared/kanaDeck";
import { DEFAULT_SCROLLS_SETTINGS } from "./constants";
import { scheduleReview } from "./scheduler";
import type { GradeEntry, ScrollCard, ScrollGrade, ScrollMode, ScrollSession, ScrollsSettings } from "./types";

export type ScrollsGame =
  | { screen: "lobby" }
  | { screen: "session"; session: ScrollSession }
  /** O resumo ainda guarda a sessão: dá para desfazer a última nota mesmo depois da última carta. */
  | { screen: "summary"; session: ScrollSession };

export interface ScrollsState {
  settings: ScrollsSettings;
  game: ScrollsGame;
}

export type ScrollsAction =
  | { type: "UPDATE_SETTINGS"; patch: Partial<ScrollsSettings> }
  | { type: "TOGGLE_GROUP"; groupId: string }
  | { type: "START"; id: string; mode: ScrollMode; cards: ScrollCard[]; now: number; offsetAt: UtcOffsetFn }
  | { type: "FLIP"; cardKey: string; now: number }
  | { type: "GRADE"; cardKey: string; grade: ScrollGrade; now: number }
  | { type: "UNDO" }
  | { type: "FINISH" }
  | { type: "CLOSE" };

export function createScrollsState(settings: ScrollsSettings = DEFAULT_SCROLLS_SETTINGS): ScrollsState {
  return { settings: { ...settings, selectedGroupIds: [...settings.selectedGroupIds] }, game: { screen: "lobby" } };
}

/**
 * Cada carta aparece uma vez por sessão: "Errei" não a repete agora, ela vence hoje mesmo e
 * volta na próxima sessão de revisão (ver `scheduleReview`).
 */
function grade(session: ScrollSession, card: ScrollCard, value: ScrollGrade, now: number) {
  const scheduled = session.mode === "review" ? scheduleReview(value, now, session.offsetAt) : null;

  const entry: GradeEntry = {
    card,
    grade: value,
    gradedAt: now,
    shownAt: session.shownAt,
    flippedAt: session.flippedAt ?? now,
    toBox: scheduled?.box ?? null,
    dueAt: scheduled?.dueAt ?? null,
  };

  return {
    ...session,
    queue: session.queue.slice(1),
    history: [...session.history, entry],
    flipped: false,
    shownAt: now,
    flippedAt: null,
  };
}

function undo(session: ScrollSession): ScrollSession | null {
  const last = session.history[session.history.length - 1];
  if (!last) return null;

  // A carta volta virada: quem desfaz já viu a resposta e quer só trocar a nota.
  return {
    ...session,
    queue: [last.card, ...session.queue],
    history: session.history.slice(0, -1),
    flipped: true,
    shownAt: last.shownAt,
    flippedAt: last.flippedAt,
  };
}

export function scrollsReducer(state: ScrollsState, action: ScrollsAction): ScrollsState {
  const { game } = state;

  switch (action.type) {
    case "UPDATE_SETTINGS": {
      if (game.screen !== "lobby") return state;
      const next = { ...state.settings, ...action.patch };
      // Os grupos pertencem ao alfabeto (ou aos kanji): ao trocar, a seleção é limpa (igual à Arena).
      if (groupsKey(next) !== groupsKey(state.settings) && action.patch.selectedGroupIds === undefined) next.selectedGroupIds = [];
      return { ...state, settings: next };
    }

    case "TOGGLE_GROUP":
      if (game.screen !== "lobby") return state;
      return {
        ...state,
        settings: { ...state.settings, selectedGroupIds: toggleGroupSelection(state.settings.selectedGroupIds, action.groupId) },
      };

    case "START": {
      if (game.screen === "session" || action.cards.length === 0) return state;
      const session: ScrollSession = {
        id: action.id,
        mode: action.mode,
        offsetAt: action.offsetAt,
        queue: action.cards,
        history: [],
        flipped: false,
        shownAt: action.now,
        flippedAt: null,
      };
      return { ...state, game: { screen: "session", session } };
    }

    case "FLIP": {
      if (game.screen !== "session") return state;
      const { session } = game;
      if (session.flipped || session.queue[0]?.key !== action.cardKey) return state;
      return { ...state, game: { screen: "session", session: { ...session, flipped: true, flippedAt: action.now } } };
    }

    case "GRADE": {
      // Nota de uma carta que já saiu da mesa (clique duplo, tecla repetida) é ignorada pela chave.
      if (game.screen !== "session") return state;
      const card = game.session.queue[0];
      if (!card || card.key !== action.cardKey || !game.session.flipped) return state;

      const session = grade(game.session, card, action.grade, action.now);
      return { ...state, game: session.queue.length === 0 ? { screen: "summary", session } : { screen: "session", session } };
    }

    case "UNDO": {
      if (game.screen === "lobby") return state;
      const session = undo(game.session);
      return session ? { ...state, game: { screen: "session", session } } : state;
    }

    case "FINISH":
      if (game.screen !== "session") return state;
      // Encerrar sem nenhuma nota não tem o que resumir.
      return { ...state, game: game.session.history.length === 0 ? { screen: "lobby" } : { screen: "summary", session: game.session } };

    case "CLOSE":
      return game.screen === "summary" ? { ...state, game: { screen: "lobby" } } : state;

    default:
      return state;
  }
}
