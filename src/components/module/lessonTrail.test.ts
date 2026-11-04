import { describe, expect, it } from "vitest";
import { hiraganaGroups } from "@/data/hiragana";
import { practicaGroups } from "@/data/pratica";
import type { LessonProgress } from "@/hooks/useProgress";
import { buildTrail, lessonGlyph, moduleHref, nextLesson, parseKanaSection, summarizeTrail } from "./lessonTrail";

function done(lessonId: string, score: number): LessonProgress {
  return { lessonId, completed: true, score, lastPracticed: "2026-11-01T00:00:00.000Z", errorCount: {} };
}

const groups = hiraganaGroups.slice(0, 4);
const scoped = (group: { id: string }) => `hiragana__${group.id}`;

describe("trilha de lições", () => {
  it("concluídas com nota; a 1ª liberada e não concluída é a próxima; o resto fica disponível", () => {
    const progress: Record<string, LessonProgress> = { "hiragana__a-row": done("hiragana__a-row", 92), "hiragana__sa-row": done("hiragana__sa-row", 70) };
    const trail = buildTrail({ groups, getScopedId: scoped, getProgress: (id) => progress[id] ?? null, isUnlocked: () => true });

    expect(trail.map((lesson) => [lesson.state, lesson.score])).toEqual([
      ["completed", 92],
      ["next", null],
      ["completed", 70],
      ["available", null],
    ]);
    expect(nextLesson(trail)?.scopedId).toBe("hiragana__ka-row");
    expect(summarizeTrail(trail)).toEqual({ completed: 2, total: 4, percent: 50 });
  });

  it("em sequência: só a seguinte à última concluída libera; as outras ficam bloqueadas", () => {
    const progress: Record<string, LessonProgress> = { "pratica__frases-basicas": done("pratica__frases-basicas", 80) };
    const trail = buildTrail({
      groups: practicaGroups,
      getScopedId: (group) => `pratica__${group.id}`,
      getProgress: (id) => progress[id] ?? null,
      isUnlocked: (index, ids) => index === 0 || progress[ids[index - 1]]?.completed === true,
    });
    expect(trail.map((lesson) => lesson.state)).toEqual(["completed", "next", ...Array(practicaGroups.length - 2).fill("locked")]);
  });

  it("tudo concluído: sem próxima lição, 100%", () => {
    const trail = buildTrail({ groups, getScopedId: scoped, getProgress: (id) => done(id, 100), isUnlocked: () => true });
    expect(nextLesson(trail)).toBeNull();
    expect(summarizeTrail(trail).percent).toBe(100);
    expect(summarizeTrail([])).toEqual({ completed: 0, total: 0, percent: 0 });
  });
});

describe("seção na URL e volta da lição", () => {
  it("só aceita as seções que existem (o resto cai no Hiragana)", () => {
    expect(parseKanaSection("katakana")).toBe("katakana");
    expect(parseKanaSection("kanji")).toBe("kanji");
    expect(parseKanaSection("klingon")).toBe("hiragana");
    expect(parseKanaSection(null)).toBe("hiragana");
  });

  it("a lição de kana volta para a própria seção; os outros módulos voltam para a página do módulo", () => {
    expect(moduleHref("kana", "katakana__ka-row")).toBe("/module/kana?secao=katakana");
    expect(moduleHref("kana", "kanji__numeros")).toBe("/module/kana?secao=kanji");
    expect(moduleHref("kana")).toBe("/module/kana");
    expect(moduleHref("kana", "lixo")).toBe("/module/kana");
    expect(moduleHref("japones-pratica", "pratica__frases-basicas")).toBe("/module/japones-pratica");
  });

  it("emblema: 1º caractere da lição (de palavras, a 1ª letra)", () => {
    expect(lessonGlyph(hiraganaGroups[0], "?")).toBe("あ");
    expect(lessonGlyph(practicaGroups[0], "?")).toBe("お");
    expect(lessonGlyph({ ...practicaGroups[0], chars: [] }, "話")).toBe("話");
  });
});
