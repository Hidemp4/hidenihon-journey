import { describe, expect, it } from "vitest";
import { NEW_YORK, SAO_PAULO, TOKYO } from "@/features/dojo/shared/test/zones";
import { describeDays, describeDueAt, describeReturn, intervalDays, scheduleReview } from "./scheduler";

describe("agenda: intervalos fixos por nota", () => {
  it("Errei volta na próxima sessão (0 dias), Acertei em 1 dia, Fácil em 3 dias", () => {
    expect(intervalDays("again")).toBe(0);
    expect(intervalDays("good")).toBe(1);
    expect(intervalDays("easy")).toBe(3);
  });

  it("o intervalo não cresce: dar Fácil de novo volta sempre em 3 dias", () => {
    const noon = Date.UTC(2026, 9, 31, 15); // 31/10 12:00 em SP
    const first = scheduleReview("easy", noon, SAO_PAULO);
    const again = scheduleReview("easy", first.dueAt + 12 * 3_600_000, SAO_PAULO);
    expect(first).toEqual({ box: 3, dueAt: Date.UTC(2026, 10, 3, 3) });
    expect(again).toEqual({ box: 3, dueAt: Date.UTC(2026, 10, 6, 3) });
  });
});

describe("agenda: vencimento", () => {
  const noonSaoPaulo = Date.UTC(2026, 9, 31, 15); // 31/10 12:00 em SP

  it("Errei vence hoje mesmo (já está vencida): entra na próxima sessão", () => {
    const { box, dueAt } = scheduleReview("again", noonSaoPaulo, SAO_PAULO);
    expect(box).toBe(1);
    expect(dueAt).toBe(Date.UTC(2026, 9, 31, 3));
    expect(dueAt).toBeLessThanOrEqual(noonSaoPaulo);
  });

  it("vence na meia-noite local do dia de destino", () => {
    expect(scheduleReview("good", noonSaoPaulo, SAO_PAULO)).toEqual({ box: 2, dueAt: Date.UTC(2026, 10, 1, 3) });
    expect(scheduleReview("easy", noonSaoPaulo, SAO_PAULO)).toEqual({ box: 3, dueAt: Date.UTC(2026, 10, 3, 3) });
  });

  it("revisar às 23:59 com Acertei deixa a carta vencida 1 minuto depois (virada de dia local)", () => {
    const late = Date.UTC(2026, 10, 1, 2, 59); // 31/10 23:59 em SP
    const { dueAt } = scheduleReview("good", late, SAO_PAULO);

    expect(dueAt - late).toBe(60_000);
  });

  it("o mesmo instante agenda para meias-noites diferentes em fusos diferentes", () => {
    const instant = Date.UTC(2026, 10, 1, 2, 59); // SP: 31/10 23:59 · Tóquio: 01/11 11:59

    expect(scheduleReview("good", instant, SAO_PAULO).dueAt).toBe(Date.UTC(2026, 10, 1, 3));
    expect(scheduleReview("good", instant, TOKYO).dueAt).toBe(Date.UTC(2026, 10, 1, 15));
  });

  it("atravessa o fim do horário de verão contando dias, não blocos de 24h", () => {
    const saturdayNoon = Date.UTC(2026, 9, 31, 16); // 31/10 12:00 EDT
    expect(scheduleReview("easy", saturdayNoon, NEW_YORK).dueAt).toBe(Date.UTC(2026, 10, 3, 5)); // 03/11 00:00 EST
  });

  it("descreve o vencimento em dias locais e o efeito da nota", () => {
    expect(describeDays(0)).toBe("hoje");
    expect(describeDays(1)).toBe("amanhã");
    expect(describeDays(7)).toBe("em 7 dias");
    expect(describeDueAt(Date.UTC(2026, 10, 1, 3), Date.UTC(2026, 10, 1, 2, 59), SAO_PAULO)).toBe("amanhã");
    expect([0, 1, 3].map(describeReturn)).toEqual(["na próxima sessão", "amanhã", "em 3 dias"]);
  });
});
