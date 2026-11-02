import { describe, expect, it } from "vitest";
import { createRng } from "@/features/dojo/shared/components/arena/rng";
import { getKanjiStudyItems } from "@/features/dojo/shared/kanjiDeck";
import { getKanaStudyItems, type KanaStudyItem } from "@/features/dojo/shared/studyItem";
import { CONFUSABLE_SETS, confusablesOf } from "./confusables";
import { buildQuestion, pickQuestionItem } from "./questions";
import type { QuestionDirection } from "./types";

const HIRAGANA = getKanaStudyItems("hiragana");
const KATAKANA = getKanaStudyItems("katakana");
const MIXED = getKanaStudyItems("mixed");
const byChar = (char: string, deck = MIXED) => {
  const item = deck.find((candidate) => candidate.char === char);
  if (!item) throw new Error(`sem ${char}`);
  return item;
};

function question(item: KanaStudyItem, deck: readonly KanaStudyItem[], direction: QuestionDirection, seed: number, hard = false) {
  return buildQuestion({ id: `q-${seed}`, item, deck, direction, rng: createRng(seed), hard });
}

describe("confundíveis", () => {
  it("todo caractere listado existe no baralho (kana ou kanji N5), sem misturar os dois, e cada conjunto tem pelo menos 2", () => {
    const kana = new Set(MIXED.map((item) => item.char));
    const kanji = new Set(getKanjiStudyItems().map((item) => item.char));
    for (const set of CONFUSABLE_SETS) {
      expect(set.length).toBeGreaterThanOrEqual(2);
      const allKana = set.every((char) => kana.has(char));
      const allKanji = set.every((char) => kanji.has(char));
      expect(allKana || allKanji, set.join("")).toBe(true);
    }
  });

  it("é simétrico e cruza alfabetos quando o conjunto mistura (し × ン)", () => {
    expect(confusablesOf("し")).toEqual(new Set(["つ", "そ", "ン"]));
    expect(confusablesOf("ン").has("し")).toBe(true);
    expect(confusablesOf("ン").has("ツ")).toBe(true);
    expect(confusablesOf("か").size).toBe(0);
  });
});

describe("gerador de perguntas", () => {
  it("propriedades em todo o baralho, nas duas direções e em várias sementes", () => {
    for (const direction of ["kana-to-romaji", "romaji-to-kana"] as const) {
      for (const item of MIXED) {
        for (const seed of [1, 2, 3]) {
          const q = question(item, MIXED, direction, seed);
          const labels = q.options.map((option) => option.label);

          expect(q.options).toHaveLength(4);
          // A correta está sempre lá, na posição indicada.
          expect(q.options[q.correctIndex].itemId).toBe(item.id);
          // Nunca repete alternativa e nenhum distrator é a resposta.
          expect(new Set(labels).size).toBe(labels.length);
          const distractors = q.options.filter((_, index) => index !== q.correctIndex);
          for (const option of distractors) {
            expect(option.itemId).not.toBe(item.id);
            const distractor = MIXED.find((candidate) => candidate.id === option.itemId);
            // Mesmo som (あ × ア) também seria certa: fica fora.
            expect(distractor?.romaji).not.toBe(item.romaji);
            if (direction === "romaji-to-kana") expect(distractor?.script).toBe(item.script);
          }
        }
      }
    }
  });

  it("prioriza confundíveis e depois o mesmo grupo", () => {
    const shi = byChar("し", HIRAGANA);
    const q = question(shi, HIRAGANA, "kana-to-romaji", 4);
    const chars = q.options.map((option) => HIRAGANA.find((item) => item.id === option.itemId)?.char);

    expect(chars).toEqual(expect.arrayContaining(["し", "つ", "そ"]));
    const fourth = chars.find((char) => !["し", "つ", "そ"].includes(char ?? ""));
    expect(["さ", "す", "せ"]).toContain(fourth); // o grupo さ行 completa
  });

  it("modo difícil enche com confundíveis; o normal deixa vaga para o grupo", () => {
    const shi = byChar("シ", KATAKANA);
    const normal = question(shi, KATAKANA, "kana-to-romaji", 1);
    const hard = question(shi, KATAKANA, "kana-to-romaji", 1, true);
    const confusable = (q: ReturnType<typeof question>) =>
      q.options.filter((option) => confusablesOf("シ").has(KATAKANA.find((item) => item.id === option.itemId)?.char ?? "")).length;

    expect(confusable(normal)).toBe(2);
    expect(confusable(hard)).toBe(3); // ツ, ソ, ン
  });

  it("a posição da correta vem do rng (e varia)", () => {
    const ka = byChar("か", HIRAGANA);
    const positions = new Set(Array.from({ length: 40 }, (_, seed) => question(ka, HIRAGANA, "kana-to-romaji", seed + 1).correctIndex));

    expect(positions).toEqual(new Set([0, 1, 2, 3]));
    expect(question(ka, HIRAGANA, "kana-to-romaji", 7)).toEqual(question(ka, HIRAGANA, "kana-to-romaji", 7));
  });

  it("baralho com menos de 4 kana reduz as alternativas sem quebrar", () => {
    const ya = HIRAGANA.filter((item) => item.groupId === "hiragana:ya-row");
    expect(ya).toHaveLength(3);
    const q = question(ya[0], ya, "romaji-to-kana", 2);
    expect(q.options).toHaveLength(3);
    expect(q.options[q.correctIndex].label).toBe("や");

    const lonely = question(ya[0], [ya[0]], "kana-to-romaji", 2);
    expect(lonely.options).toEqual([{ itemId: ya[0].id, label: "ya" }]);
    expect(lonely.correctIndex).toBe(0);
  });

  it("modo Ambos: romaji → kana não oferece o kana do outro alfabeto com o mesmo som", () => {
    const a = byChar("あ");
    for (let seed = 1; seed < 20; seed += 1) {
      const labels = question(a, MIXED, "romaji-to-kana", seed).options.map((option) => option.label);
      expect(labels).not.toContain("ア");
    }
  });

  it("escolhe o próximo kana evitando os recentes e pesando pelo domínio", () => {
    const deck = HIRAGANA.slice(0, 5);
    const recent = deck.slice(0, 3).map((item) => item.id);
    const picked = pickQuestionItem(deck, recent, createRng(3), new Map());
    expect(recent).not.toContain(picked?.id);

    const heavy = new Map([[deck[4].id, 1_000]]);
    expect(pickQuestionItem(deck, [], createRng(8), heavy)?.id).toBe(deck[4].id);
  });
});

describe("perguntas de kanji", () => {
  const KANJI = getKanjiStudyItems();
  const kanji = (char: string) => {
    const item = KANJI.find((candidate) => candidate.char === char);
    if (!item) throw new Error(char);
    return item;
  };

  it("kanji → significado: alternativas são significados, únicos, com a correta presente", () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      for (const item of KANJI) {
        const question = buildQuestion({ id: "q", item, deck: KANJI, direction: "kana-to-romaji", rng: createRng(seed * 31 + item.char.charCodeAt(0)) });
        const labels = question.options.map((option) => option.label);
        expect(question.options).toHaveLength(4);
        expect(labels[question.correctIndex]).toBe(item.meaning);
        expect(new Set(labels).size).toBe(4);
      }
    }
  });

  it("significado → kanji: alternativas são kanji; os parecidos no desenho entram primeiro", () => {
    const question = buildQuestion({ id: "q", item: kanji("日"), deck: KANJI, direction: "romaji-to-kana", rng: createRng(3) });
    expect(question.options[question.correctIndex].label).toBe("日");
    const distractors = question.options.filter((_, index) => index !== question.correctIndex).map((option) => option.label);
    expect(distractors.filter((label) => ["目", "白", "百"].includes(label)).length).toBeGreaterThanOrEqual(2);
  });

  it("baralho misto kana + kanji nunca oferece kana como alternativa de 'qual é o kanji?'", () => {
    const deck = [...KANJI, ...HIRAGANA];
    for (let seed = 1; seed <= 30; seed += 1) {
      const question = buildQuestion({ id: "q", item: kanji("水"), deck, direction: "romaji-to-kana", rng: createRng(seed) });
      for (const option of question.options) expect(KANJI.some((item) => item.id === option.itemId), option.label).toBe(true);
    }
  });
});
