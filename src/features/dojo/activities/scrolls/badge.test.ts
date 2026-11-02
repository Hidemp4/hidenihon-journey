import { describe, expect, it } from "vitest";
import { describeScrollsBadge } from "./badge";
import { DAY, NOON, record } from "./testUtils";

describe("badge dos Pergaminhos", () => {
  it("conta o que venceu até agora", () => {
    const items = {
      "hiragana:あ": record({ dueAt: NOON - DAY }),
      "hiragana:い": record({ dueAt: NOON }),
      "hiragana:う": record({ dueAt: NOON + DAY }),
    };
    expect(describeScrollsBadge(items, NOON)).toEqual({ text: "2 para revisar hoje", tone: "accent" });
  });

  it("sem nada vencido: em dia ou ainda sem revisões", () => {
    expect(describeScrollsBadge({ "hiragana:あ": record({ dueAt: NOON + DAY }) }, NOON)).toEqual({ text: "Tudo em dia", tone: "neutral" });
    // Visto só na Arena (sem agenda) ainda não é revisão.
    expect(describeScrollsBadge({ "hiragana:あ": record({ dueAt: null }) }, NOON)).toEqual({ text: "Nenhuma revisão ainda", tone: "neutral" });
  });
});
