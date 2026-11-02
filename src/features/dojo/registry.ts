import { getBrushBadge } from "./activities/brush/badge";
import { getExamBadge } from "./activities/exam/badge";
import { getReflexesBadge } from "./activities/reflexes/badge";
import { getScrollsBadge } from "./activities/scrolls/badge";
import { getSealsBadge } from "./activities/seals/badge";
import { DOJO_HUB_ROUTE } from "./shared/constants";

export type ActivityId = "scrolls" | "reflexes" | "exam" | "seals" | "brush";
export type ActivityStatus = "ready" | "coming-soon";

export interface ActivityBadge {
  text: string;
  /** `accent`: dado da pessoa; `neutral`: pronta, mas sem dados; `muted`: em breve. */
  tone: "accent" | "neutral" | "muted";
}

export interface ActivityBadgeContext {
  /** Epoch em ms: badges como "para revisar hoje" dependem do dia. */
  now: number;
}

export interface DojoActivity {
  id: ActivityId;
  name: string;
  kanji: string;
  /** Trecho da URL depois de `/dojo/` (as rotas do dojô são relativas ao hub). */
  slug: string;
  route: string;
  description: string;
  status: ActivityStatus;
  getBadge: (context: ActivityBadgeContext) => ActivityBadge;
}

export const ACTIVITY_STATUS_LABELS: Readonly<Record<ActivityStatus, string>> = {
  ready: "Pronta",
  "coming-soon": "Em breve",
};

const COMING_SOON_BADGE: ActivityBadge = { text: ACTIVITY_STATUS_LABELS["coming-soon"], tone: "muted" };
/** Badge de uma atividade "em breve" (todas estão prontas desde a Fase 4; fica para as próximas). */
export const comingSoonBadge = (): ActivityBadge => COMING_SOON_BADGE;

function defineActivity(activity: Omit<DojoActivity, "route">): DojoActivity {
  return { ...activity, route: `${DOJO_HUB_ROUTE}/${activity.slug}` };
}

/** A ordem aqui é a ordem dos cards no hub. */
export const DOJO_ACTIVITIES: readonly DojoActivity[] = [
  defineActivity({
    id: "scrolls",
    name: "Pergaminhos",
    kanji: "巻物",
    slug: "pergaminhos",
    description: "Flashcards com revisão espaçada.",
    status: "ready",
    getBadge: ({ now }) => getScrollsBadge(now),
  }),
  defineActivity({
    id: "reflexes",
    name: "Arena de Reflexos",
    kanji: "反応",
    slug: "reflexos",
    description: "Veja o kana e digite o romaji rápido.",
    status: "ready",
    getBadge: () => getReflexesBadge(),
  }),
  defineActivity({
    id: "exam",
    name: "Exame Chunin",
    kanji: "中忍試験",
    slug: "exame",
    description: "Quiz de múltipla escolha com 4 alternativas.",
    status: "ready",
    getBadge: () => getExamBadge(),
  }),
  defineActivity({
    id: "seals",
    name: "Selos",
    kanji: "印",
    slug: "selos",
    description: "Jogo da memória com kana e kanji.",
    status: "ready",
    getBadge: () => getSealsBadge(),
  }),
  defineActivity({
    id: "brush",
    name: "Pincel",
    kanji: "筆",
    slug: "pincel",
    description: "Escreva kana e kanji traço a traço.",
    status: "ready",
    getBadge: () => getBrushBadge(),
  }),
];

export function getActivity(id: ActivityId): DojoActivity {
  const activity = DOJO_ACTIVITIES.find((item) => item.id === id);
  // Só acontece se alguém tirar uma atividade da lista sem tirar o uso dela.
  if (!activity) throw new Error(`Atividade desconhecida: ${id}`);
  return activity;
}
