import type { KanaAlphabet } from "@/features/dojo/shared/kanaDeck";
import type { MasteryOutcome } from "@/features/dojo/shared/mastery";
import type { StudyContent } from "@/features/dojo/shared/content";
import type { StudyItem } from "@/features/dojo/shared/studyItem";
import type { DrawingScore } from "./scoring";
import type { StrokeVerdict } from "./strokeCheck";
import type { GlyphModel } from "./strokeData";
import type { Point } from "./strokePath";

/** Traçar (com guia e conferência traço a traço), De memória (sem guia) ou Estudar ordem (só animação). */
export type BrushMode = "trace" | "recall" | "study";
/** Autoavaliação do modo De memória. */
export type SelfGrade = "again" | "almost" | "good";

export interface BrushSettings {
  mode: BrushMode;
  content: StudyContent;
  /** Só vale para kana. */
  alphabet: KanaAlphabet;
  selectedGroupIds: string[];
  sessionSize: number;
}

export interface BrushCard {
  /** `idDaSessão:posição`: ações de um kana que já saiu da mesa são ignoradas pela chave. */
  key: string;
  item: StudyItem;
  glyph: GlyphModel;
}

/** Um traço desenhado, em unidades do quadro de 109 (independe do tamanho da tela). */
export type DrawnStroke = Point[];

export interface TraceFeedback {
  /** Muda a cada traço conferido: o anúncio nunca repete o mesmo texto. */
  id: number;
  strokeIndex: number;
  verdict: StrokeVerdict;
  /** Tentativa no mesmo traço (1, 2, …): entra no anúncio para o texto mudar a cada erro repetido. */
  attempt: number;
}

export interface BrushAttempt {
  card: BrushCard;
  mode: BrushMode;
  strokes: DrawnStroke[];
  /** `null` no Estudar ordem (nada desenhado). */
  score: DrawingScore | null;
  /** Traços recusados no modo Traçar (forma, ordem ou direção). */
  corrections: number;
  /** Só ordem e direção: é o que decide acerto/erro no Traçar (forma depende da mão e da tela). */
  orderErrors: number;
  grade: SelfGrade | null;
  /** O que vai para o domínio; `null` = não conta (Estudar ordem). */
  outcome: MasteryOutcome | null;
}

export interface BrushSession {
  id: string;
  mode: BrushMode;
  cards: BrushCard[];
  index: number;
  /** Traços do kana atual (no Traçar, só os aceitos). */
  strokes: DrawnStroke[];
  /** `drawing`: desenhando; `checked`: Traçar completo ou De memória conferido (o modelo aparece por cima). */
  phase: "drawing" | "checked";
  score: DrawingScore | null;
  corrections: number;
  orderErrors: number;
  feedback: TraceFeedback | null;
  attempts: BrushAttempt[];
}
