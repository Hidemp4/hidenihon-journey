import type { Rng } from "@/features/dojo/shared/components/arena/rng";
import { sampleWeighted } from "@/features/dojo/shared/random";
import type { StudyItem } from "@/features/dojo/shared/studyItem";
import type { GlyphModel } from "./strokeData";
import type { BrushCard, BrushMode } from "./types";

/** Só entra quem tem traços nos dados: sem modelo não há guia, animação nem nota. */
export function withGlyphs(items: readonly StudyItem[], glyphs: ReadonlyMap<string, GlyphModel>) {
  return items.flatMap((item) => {
    const glyph = glyphs.get(item.char);
    return glyph ? [{ item, glyph }] : [];
  });
}

interface BuildCardsInput {
  sessionId: string;
  mode: BrushMode;
  items: readonly StudyItem[];
  glyphs: ReadonlyMap<string, GlyphModel>;
  size: number;
  weights: ReadonlyMap<string, number>;
  rng: Rng;
}

export function buildBrushCards({ sessionId, mode, items, glyphs, size, weights, rng }: BuildCardsInput): BrushCard[] {
  const available = withGlyphs(items, glyphs);
  // Estudar ordem segue o baralho (あいうえお…): é para conhecer a família inteira, não para sortear.
  const picked = mode === "study" ? available.slice(0, size) : sampleWeighted(available, size, rng, ({ item }) => weights.get(item.id) ?? 1);
  return picked.map(({ item, glyph }, index) => ({ key: `${sessionId}:${index}`, item, glyph }));
}
