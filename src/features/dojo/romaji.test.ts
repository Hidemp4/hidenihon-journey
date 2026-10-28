import { describe, expect, it } from "vitest";
import { evaluateAnswer, getAcceptedRomaji } from "./romaji";

describe("evaluateAnswer", () => {
  it("aceita o romaji exato", () => {
    expect(evaluateAnswer("ka", "ka")).toBe("correct");
    expect(evaluateAnswer("a", "a")).toBe("correct");
  });

  it("ignora maiúsculas e espaços nas pontas", () => {
    expect(evaluateAnswer("shi", " SHI ")).toBe("correct");
  });

  it("aceita variantes de digitação (si, tu, hu...)", () => {
    expect(evaluateAnswer("shi", "si")).toBe("correct");
    expect(evaluateAnswer("tsu", "tu")).toBe("correct");
    expect(evaluateAnswer("fu", "hu")).toBe("correct");
    expect(evaluateAnswer("sha", "sya")).toBe("correct");
    expect(getAcceptedRomaji("chi")).toEqual(["chi", "ti"]);
  });

  it("considera parcial enquanto ainda é prefixo de uma resposta aceita", () => {
    expect(evaluateAnswer("shi", "")).toBe("partial");
    expect(evaluateAnswer("shi", "s")).toBe("partial");
    expect(evaluateAnswer("shi", "sh")).toBe("partial");
  });

  it("erra imediatamente quando não pode mais virar uma resposta aceita", () => {
    expect(evaluateAnswer("shi", "sa")).toBe("wrong");
    expect(evaluateAnswer("ka", "ke")).toBe("wrong");
    expect(evaluateAnswer("ka", "kaa")).toBe("wrong");
  });
});
