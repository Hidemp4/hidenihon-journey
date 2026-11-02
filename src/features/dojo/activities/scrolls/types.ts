import type { UtcOffsetFn } from "@/features/dojo/shared/calendar";
import type { StudyContent } from "@/features/dojo/shared/content";
import type { KanaAlphabet } from "@/features/dojo/shared/kanaDeck";
import type { StudyItem } from "@/features/dojo/shared/studyItem";

/** Errei / Acertei / Fácil. */
export type ScrollGrade = "again" | "good" | "easy";
/** `free` ignora a agenda: não muda vencimento. */
export type ScrollMode = "review" | "free";

/**
 * A direção é fixa: a frente mostra o caractere e o verso a leitura (kana → romaji;
 * kanji → leituras em kana e romaji). Por isso não há opção de direção.
 */
export interface ScrollsSettings {
  content: StudyContent;
  /** Só vale para kana. */
  alphabet: KanaAlphabet;
  selectedGroupIds: string[];
  newPerDay: number;
}

export interface ScrollCard {
  /** Único na sessão (cada carta aparece uma vez só). */
  key: string;
  item: StudyItem;
  /** Ainda não entrou na agenda. */
  isNew: boolean;
}

export interface GradeEntry {
  card: ScrollCard;
  grade: ScrollGrade;
  gradedAt: number;
  shownAt: number;
  flippedAt: number;
  /** Preenchidos só na revisão (`review`). */
  toBox: number | null;
  dueAt: number | null;
}

export interface ScrollSession {
  id: string;
  mode: ScrollMode;
  offsetAt: UtcOffsetFn;
  /** `queue[0]` é a carta na mesa. */
  queue: ScrollCard[];
  history: GradeEntry[];
  flipped: boolean;
  shownAt: number;
  flippedAt: number | null;
}
