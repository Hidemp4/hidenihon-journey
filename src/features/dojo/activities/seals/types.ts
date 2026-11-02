import type { KanaAlphabet } from "@/features/dojo/shared/kanaDeck";
import type { StudyItem } from "@/features/dojo/shared/studyItem";

/** Kana ↔ romaji (あ ↔ a), hiragana ↔ katakana do mesmo som (あ ↔ ア) ou kanji ↔ significado (水 ↔ água). */
export type SealPairType = "kana-romaji" | "hiragana-katakana" | "kanji-meaning";
export type SealBoardSizeId = "3x4" | "4x4" | "4x6";

export interface SealsSettings {
  pairType: SealPairType;
  /** Só vale para kana ↔ romaji: hiragana ↔ katakana usa sempre os dois alfabetos. */
  alphabet: KanaAlphabet;
  sizeId: SealBoardSizeId;
  /** Grupos do conteúdo (`contentSelection`): de um alfabeto ou temas de kanji. Vazio = todos. */
  selectedGroupIds: string[];
}

export interface SealFace {
  text: string;
  /** `ja` para kana (fonte japonesa); `null` para romaji. */
  lang: "ja" | null;
}

export interface SealPair {
  id: string;
  /** Itens do domínio envolvidos: o kana ou kanji, ou os dois kana (hiragana ↔ katakana). */
  items: StudyItem[];
  faces: readonly [SealFace, SealFace];
}

export interface SealCard {
  /** Posição na mesa (0…n-1): é também o id da carta nas ações. */
  index: number;
  pairId: string;
  face: SealFace;
}

/** O que acabou de acontecer: alimenta o som e o anúncio para leitor de tela. */
export type SealEvent =
  | { type: "flip"; index: number }
  | { type: "match"; indices: readonly [number, number] }
  | { type: "mismatch"; indices: readonly [number, number] };

export interface SealsBest {
  moves: number;
  /** Duração da partida (da 1ª virada ao último par). */
  ms: number;
  stars: number;
  /** Epoch em ms. */
  finishedAt: number;
}

export interface SealsBoard {
  id: string;
  /** Chave do recorde (`sealsConfigKey`): tipo de par + alfabeto + tamanho. */
  configKey: string;
  pairType: SealPairType;
  sizeId: SealBoardSizeId;
  /** Fixado no início: girar o celular no meio não pode embaralhar as posições que a pessoa decorou. */
  columns: number;
  pairs: SealPair[];
  cards: SealCard[];
  matchedPairIds: string[];
  /** Cartas viradas e ainda sem par: 0, 1 ou 2 (2 = errou e está esperando desvirar). */
  open: number[];
  /** Jogada errada esperando desvirar. O timer manda este id: um aviso atrasado não fecha a jogada seguinte. */
  pendingMoveId: string | null;
  moves: number;
  /** Cartas já vistas ao menos uma vez (para separar "explorando" de "esqueci"). */
  seen: boolean[];
  /** Pares em que a pessoa errou já tendo visto o parceiro: vão como erro para o domínio. */
  slippedPairIds: string[];
  /** Relógio monotônico (ms). O cronômetro começa na 1ª virada, não ao abrir a mesa. */
  startedAt: number | null;
  finishedAt: number | null;
  lastEvent: SealEvent | null;
  /** Recorde desta configuração antes da partida: decide o "novo recorde" sem depender de quando gravou. */
  previousBest: SealsBest | null;
}
