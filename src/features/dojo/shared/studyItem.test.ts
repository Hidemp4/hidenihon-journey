import { describe, expect, it } from "vitest";
import { filterKanaDeck, getAvailableGroups, getKanaDeck } from "./kanaDeck";
import { getKanaStudyItems, isStudyItemId, kanaToStudyItem, studyItemId } from "./studyItem";

describe("StudyItem a partir do kanaDeck", () => {
  it("gera ids únicos alphabet:char no modo misto (o mesmo som em hiragana e katakana não colide)", () => {
    const items = getKanaStudyItems("mixed");
    const ids = items.map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("hiragana:あ");
    expect(ids).toContain("katakana:ア");
    expect(items.length).toBe(getKanaDeck("mixed").length);
  });

  it("copia os campos do kana sem perder o grupo", () => {
    const kana = getKanaDeck("katakana")[0];
    expect(kanaToStudyItem(kana)).toEqual({
      id: `katakana:${kana.char}`,
      kind: "kana",
      script: "katakana",
      char: kana.char,
      romaji: kana.romaji,
      readings: [kana.romaji],
      groupId: kana.groupId,
      groupTitle: kana.groupTitle,
    });
  });

  it("respeita o mesmo filtro de grupos do deck da Arena", () => {
    const [group] = getAvailableGroups("hiragana");
    const items = getKanaStudyItems("hiragana", [group.id]);

    expect(items.map((item) => item.char)).toEqual(filterKanaDeck("hiragana", [group.id]).map((kana) => kana.char));
    expect(items.every((item) => item.groupId === group.id)).toBe(true);
  });

  it("reconhece só ids no formato das atividades", () => {
    expect(isStudyItemId(studyItemId("hiragana", "あ"))).toBe(true);
    expect(isStudyItemId(studyItemId("kanji", "山"))).toBe(true);
    expect(isStudyItemId("hiragana:")).toBe(false);
    expect(isStudyItemId("klingon:x")).toBe(false);
    expect(isStudyItemId("あ")).toBe(false);
  });
});
