import type { StudyContent } from "@/features/dojo/shared/content";
import type { ActivityBadge } from "@/features/dojo/registry";
import { loadPracticed, type PracticedItems } from "./brushRepository";

export function countPracticed(practiced: PracticedItems, content: StudyContent): number {
  const isContent = (id: string) => (content === "kanji" ? id.startsWith("kanji:") : id.startsWith("hiragana:") || id.startsWith("katakana:"));
  return Object.keys(practiced).filter(isContent).length;
}

export function countPracticedKana(practiced: PracticedItems): number {
  return countPracticed(practiced, "kana");
}

export function describeBrushBadge(practiced: PracticedItems): ActivityBadge {
  const kana = countPracticed(practiced, "kana");
  const kanji = countPracticed(practiced, "kanji");
  if (kana === 0 && kanji === 0) return { text: "Nenhum kana praticado", tone: "neutral" };
  if (kanji === 0) return { text: kana === 1 ? "1 kana praticado" : `${kana} kana praticados`, tone: "accent" };
  if (kana === 0) return { text: `${kanji} kanji ${kanji === 1 ? "praticado" : "praticados"}`, tone: "accent" };
  return { text: `${kana} kana · ${kanji} kanji praticados`, tone: "accent" };
}

export function getBrushBadge(): ActivityBadge {
  return describeBrushBadge(loadPracticed());
}
