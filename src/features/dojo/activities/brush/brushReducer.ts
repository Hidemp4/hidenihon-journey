import { groupsKey } from "@/features/dojo/shared/content";
import { toggleGroupSelection } from "@/features/dojo/shared/kanaDeck";
import { DEFAULT_BRUSH_SETTINGS, MIN_STROKE_LENGTH } from "./constants";
import { scoreDrawing } from "./scoring";
import { checkStroke } from "./strokeCheck";
import { polylineLength } from "./strokePath";
import type { BrushAttempt, BrushCard, BrushSession, BrushSettings, DrawnStroke, SelfGrade } from "./types";

export type BrushGame =
  | { screen: "lobby" }
  | { screen: "session"; session: BrushSession }
  | { screen: "summary"; session: BrushSession };

export interface BrushState {
  settings: BrushSettings;
  game: BrushGame;
}

/**
 * Toda ação de um kana leva a chave da carta: traço que termina depois de a carta mudar
 * (dedo ainda na tela quando a pessoa aperta "Pular") é ignorado.
 */
export type BrushAction =
  | { type: "UPDATE_SETTINGS"; patch: Partial<BrushSettings> }
  | { type: "TOGGLE_GROUP"; groupId: string }
  | { type: "START"; id: string; cards: BrushCard[] }
  | { type: "STROKE"; cardKey: string; points: DrawnStroke }
  | { type: "UNDO"; cardKey: string }
  | { type: "CLEAR"; cardKey: string }
  | { type: "CHECK"; cardKey: string }
  | { type: "GRADE"; cardKey: string; grade: SelfGrade }
  | { type: "NEXT"; cardKey: string }
  | { type: "PREV"; cardKey: string }
  | { type: "SKIP"; cardKey: string }
  | { type: "FINISH" }
  | { type: "CLOSE" };

export function createBrushState(settings: BrushSettings = DEFAULT_BRUSH_SETTINGS): BrushState {
  return { settings: { ...settings, selectedGroupIds: [...settings.selectedGroupIds] }, game: { screen: "lobby" } };
}

export function currentCard(session: BrushSession): BrushCard | undefined {
  return session.cards[session.index];
}

const FRESH_CARD = { phase: "drawing", score: null, corrections: 0, orderErrors: 0, feedback: null } as const;

function freshCard(session: BrushSession, index: number): BrushSession {
  return { ...session, ...FRESH_CARD, strokes: [], index };
}

function advance(session: BrushSession, attempt: BrushAttempt | null): BrushGame {
  const next = freshCard({ ...session, attempts: attempt ? [...session.attempts, attempt] : session.attempts }, session.index + 1);
  return next.index >= session.cards.length ? { screen: "summary", session: next } : { screen: "session", session: next };
}

function attemptFrom(session: BrushSession, card: BrushCard, extra: Pick<BrushAttempt, "grade" | "outcome">): BrushAttempt {
  return {
    card,
    mode: session.mode,
    strokes: session.strokes,
    score: session.score,
    corrections: session.corrections,
    orderErrors: session.orderErrors,
    ...extra,
  };
}

/** Traçar: confere o traço contra o próximo do modelo; aceito, entra na tinta; recusado, conta a correção. */
function traceStroke(session: BrushSession, card: BrushCard, points: DrawnStroke): BrushSession | null {
  const expected = session.strokes.length;
  const verdict = checkStroke(points, card.glyph.strokes, expected);
  if (verdict.kind === "too-short") return null;

  const sameStroke = session.feedback?.strokeIndex === expected && session.feedback.verdict.kind !== "ok";
  const feedback = { id: (session.feedback?.id ?? 0) + 1, strokeIndex: expected, verdict, attempt: sameStroke ? (session.feedback?.attempt ?? 1) + 1 : 1 };

  if (verdict.kind !== "ok") {
    return {
      ...session,
      feedback,
      corrections: session.corrections + 1,
      orderErrors: session.orderErrors + (verdict.kind === "reversed" || verdict.kind === "wrong-order" ? 1 : 0),
    };
  }

  const strokes = [...session.strokes, points];
  const complete = strokes.length === card.glyph.strokes.length;
  return {
    ...session,
    strokes,
    feedback,
    phase: complete ? "checked" : "drawing",
    score: complete ? scoreDrawing(card.glyph, strokes, { fit: false }) : null,
  };
}

/** Sessão ativa e carta certa (pela chave); senão a ação é ignorada. */
function activeCard(game: BrushGame, cardKey: string): { session: BrushSession; card: BrushCard } | null {
  if (game.screen !== "session") return null;
  const card = currentCard(game.session);
  return card && card.key === cardKey ? { session: game.session, card } : null;
}

export function brushReducer(state: BrushState, action: BrushAction): BrushState {
  const { game, settings } = state;
  const withSession = (session: BrushSession): BrushState => ({ ...state, game: { screen: "session", session } });

  switch (action.type) {
    case "UPDATE_SETTINGS": {
      if (game.screen !== "lobby") return state;
      const next = { ...settings, ...action.patch };
      // Os grupos pertencem ao alfabeto (ou aos kanji): ao trocar, a seleção é limpa (igual à Arena).
      if (groupsKey(next) !== groupsKey(settings) && action.patch.selectedGroupIds === undefined) {
        next.selectedGroupIds = [];
      }
      return { ...state, settings: next };
    }

    case "TOGGLE_GROUP":
      if (game.screen !== "lobby") return state;
      return { ...state, settings: { ...settings, selectedGroupIds: toggleGroupSelection(settings.selectedGroupIds, action.groupId) } };

    case "START": {
      if (game.screen === "session" || action.cards.length === 0) return state;
      return withSession({ id: action.id, mode: settings.mode, cards: action.cards, index: 0, ...FRESH_CARD, strokes: [], attempts: [] });
    }

    case "STROKE": {
      const active = activeCard(game, action.cardKey);
      if (!active || active.session.phase !== "drawing" || active.session.mode === "study") return state;
      const { session, card } = active;

      if (session.mode === "recall") {
        // De memória não há o que conferir traço a traço; só um toque acidental fica de fora.
        if (polylineLength(action.points) < MIN_STROKE_LENGTH) return state;
        return withSession({ ...session, strokes: [...session.strokes, action.points] });
      }

      const next = traceStroke(session, card, action.points);
      return next ? withSession(next) : state;
    }

    case "UNDO": {
      const active = activeCard(game, action.cardKey);
      if (!active || active.session.phase !== "drawing" || active.session.strokes.length === 0) return state;
      return withSession({ ...active.session, strokes: active.session.strokes.slice(0, -1), feedback: null });
    }

    case "CLEAR": {
      const active = activeCard(game, action.cardKey);
      if (!active || active.session.phase !== "drawing" || active.session.strokes.length === 0) return state;
      return withSession({ ...active.session, strokes: [], feedback: null });
    }

    case "CHECK": {
      // Conferir sem ter desenhado vale (é o caminho de quem só tem teclado: lembrar, revelar e se avaliar).
      const active = activeCard(game, action.cardKey);
      if (!active || active.session.mode !== "recall" || active.session.phase !== "drawing") return state;
      const { session, card } = active;
      return withSession({ ...session, phase: "checked", score: scoreDrawing(card.glyph, session.strokes, { fit: true }) });
    }

    case "GRADE": {
      const active = activeCard(game, action.cardKey);
      if (!active || active.session.mode !== "recall" || active.session.phase !== "checked") return state;
      const outcome = action.grade === "again" ? "wrong" : "correct";
      return { ...state, game: advance(active.session, attemptFrom(active.session, active.card, { grade: action.grade, outcome })) };
    }

    case "NEXT": {
      const active = activeCard(game, action.cardKey);
      if (!active) return state;
      const { session, card } = active;

      if (session.mode === "study") {
        // Voltar e avançar de novo não conta o mesmo kana duas vezes.
        const seen = session.attempts.some((attempt) => attempt.card.key === card.key);
        return { ...state, game: advance(session, seen ? null : attemptFrom(session, card, { grade: null, outcome: null })) };
      }
      if (session.mode !== "trace" || session.phase !== "checked") return state;
      // Ordem e direção decidem; forma recusada não, porque depende da mão e do tamanho da tela.
      return { ...state, game: advance(session, attemptFrom(session, card, { grade: null, outcome: session.orderErrors === 0 ? "correct" : "wrong" })) };
    }

    case "PREV": {
      const active = activeCard(game, action.cardKey);
      if (!active || active.session.mode !== "study" || active.session.index === 0) return state;
      return withSession(freshCard(active.session, active.session.index - 1));
    }

    case "SKIP": {
      const active = activeCard(game, action.cardKey);
      if (!active || active.session.mode === "study" || active.session.phase !== "drawing") return state;
      return { ...state, game: advance(active.session, null) };
    }

    case "FINISH":
      if (game.screen !== "session") return state;
      return { ...state, game: game.session.attempts.length === 0 ? { screen: "lobby" } : { screen: "summary", session: game.session } };

    case "CLOSE":
      return game.screen === "summary" ? { ...state, game: { screen: "lobby" } } : state;

    default:
      return state;
  }
}
