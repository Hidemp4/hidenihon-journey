import type { Rng } from "@/features/dojo/shared/components/arena/rng";
import { pickAvoidingRecent, shuffle } from "@/features/dojo/shared/random";
import { answerOf } from "@/features/dojo/shared/content";
import type { StudyItem } from "@/features/dojo/shared/studyItem";
import { confusablesOf } from "./confusables";
import { NORMAL_CONFUSABLE_SLOTS, OPTION_COUNT } from "./constants";
import type { ExamDirection, QuestionDirection, QuizOption, QuizQuestion } from "./types";

export function pickQuestionDirection(direction: ExamDirection, rng: Rng): QuestionDirection {
  if (direction !== "mixed") return direction;
  return rng() < 0.5 ? "kana-to-romaji" : "romaji-to-kana";
}

/** Do caractere para a resposta: romaji (kana) ou significado (kanji); no sentido inverso, o caractere. */
export function optionLabel(item: StudyItem, direction: QuestionDirection) {
  return direction === "kana-to-romaji" ? answerOf(item) : item.char;
}

/** Escolhendo o caractere, as alternativas são do mesmo tipo (mesmo alfabeto, ou todas kanji): senão a errada se entrega. */
function sameWritingSystem(a: StudyItem, b: StudyItem) {
  if (a.kind === "kanji" || b.kind === "kanji") return a.kind === b.kind;
  return a.script === b.script;
}

interface BuildQuestionInput {
  id: string;
  item: StudyItem;
  deck: readonly StudyItem[];
  direction: QuestionDirection;
  rng: Rng;
  /** Difícil: todos os distratores possíveis vêm dos confundíveis. */
  hard?: boolean;
}

/**
 * Monta uma pergunta com até 4 alternativas: a correta + distratores por prioridade
 * (confundíveis → mesmo grupo → resto do baralho), todos com rótulos diferentes entre si.
 * Baralho pequeno = menos alternativas, nunca quebra.
 */
export function buildQuestion({ id, item, deck, direction, rng, hard = false }: BuildQuestionInput): QuizQuestion {
  const correctLabel = optionLabel(item, direction);
  const confusable = confusablesOf(item.char);

  const eligible = deck.filter(
    (candidate) =>
      candidate.id !== item.id &&
      // Mesma resposta (あ × ア no modo "Ambos") também seria certa.
      answerOf(candidate) !== answerOf(item) &&
      (direction === "kana-to-romaji" || sameWritingSystem(candidate, item))
  );

  const isConfusable = (candidate: StudyItem) => confusable.has(candidate.char);
  const confusables = shuffle(eligible.filter(isConfusable), rng);
  const sameGroup = shuffle(eligible.filter((candidate) => !isConfusable(candidate) && candidate.groupId === item.groupId), rng);
  const others = shuffle(eligible.filter((candidate) => !isConfusable(candidate) && candidate.groupId !== item.groupId), rng);

  const distractors: StudyItem[] = [];
  const usedLabels = new Set([correctLabel]);
  const take = (candidates: readonly StudyItem[], limit: number) => {
    let taken = 0;
    for (const candidate of candidates) {
      if (distractors.length >= OPTION_COUNT - 1 || taken >= limit) return;
      const label = optionLabel(candidate, direction);
      if (usedLabels.has(label)) continue;
      usedLabels.add(label);
      distractors.push(candidate);
      taken += 1;
    }
  };

  take(confusables, hard ? OPTION_COUNT - 1 : NORMAL_CONFUSABLE_SLOTS);
  take(sameGroup, Infinity);
  take(others, Infinity);
  take(confusables, Infinity); // baralho pequeno: os confundíveis que sobraram completam as alternativas

  const toOption = (candidate: StudyItem): QuizOption => ({ itemId: candidate.id, label: optionLabel(candidate, direction) });
  const options = shuffle(distractors, rng).map(toOption);
  const correctIndex = Math.floor(rng() * (options.length + 1));
  options.splice(correctIndex, 0, toOption(item));

  return { id, item, direction, options, correctIndex };
}

/** Próximo item: evita os últimos e pesa pelo domínio. */
export function pickQuestionItem(
  deck: readonly StudyItem[],
  recentIds: readonly string[],
  rng: Rng,
  weights: ReadonlyMap<string, number>
): StudyItem | null {
  return pickAvoidingRecent(deck, (item) => item.id, recentIds, rng, (item) => weights.get(item.id) ?? 1);
}
