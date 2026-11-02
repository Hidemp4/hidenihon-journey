import { describe, expect, it } from "vitest";
import { localDayNumber, localDaysBetween, startOfLocalDay, systemUtcOffset } from "./calendar";
import { MIDNIGHT_GAP, MIDNIGHT_GAP_TRANSITION, NEW_YORK, SAO_PAULO, TOKYO } from "./test/zones";

describe("calendário local", () => {
  it("o mesmo instante cai em dias diferentes conforme o fuso", () => {
    const instant = Date.UTC(2026, 9, 31, 23, 30); // 31/10 20:30 em SP, 01/11 08:30 em Tóquio

    expect(localDayNumber(instant, TOKYO) - localDayNumber(instant, SAO_PAULO)).toBe(1);
    expect(startOfLocalDay(localDayNumber(instant, SAO_PAULO), SAO_PAULO)).toBe(Date.UTC(2026, 9, 31, 3));
    expect(startOfLocalDay(localDayNumber(instant, TOKYO), TOKYO)).toBe(Date.UTC(2026, 9, 31, 15));
  });

  it("a virada acontece à meia-noite local, não à meia-noite UTC", () => {
    const beforeMidnight = Date.UTC(2026, 10, 1, 2, 59); // 31/10 23:59 em SP
    const afterMidnight = Date.UTC(2026, 10, 1, 3, 1); // 01/11 00:01 em SP

    expect(localDaysBetween(beforeMidnight, afterMidnight, SAO_PAULO)).toBe(1);
    expect(localDaysBetween(Date.UTC(2026, 10, 1, 0, 1), beforeMidnight, SAO_PAULO)).toBe(0);
  });

  it("conta dias de calendário mesmo com dia de 25h (fim do horário de verão)", () => {
    const saturdayNoon = Date.UTC(2026, 9, 31, 16); // 31/10 12:00 EDT
    const tuesdayMidnight = startOfLocalDay(localDayNumber(saturdayNoon, NEW_YORK) + 3, NEW_YORK);

    expect(tuesdayMidnight).toBe(Date.UTC(2026, 10, 3, 5)); // 03/11 00:00 EST
    expect(localDaysBetween(saturdayNoon, tuesdayMidnight, NEW_YORK)).toBe(3);
  });

  it("quando a meia-noite não existe, o dia começa no instante da troca", () => {
    const day = localDayNumber(MIDNIGHT_GAP_TRANSITION + 3_600_000, MIDNIGHT_GAP);
    const start = startOfLocalDay(day, MIDNIGHT_GAP);

    expect(start).toBe(MIDNIGHT_GAP_TRANSITION);
    expect(localDayNumber(start, MIDNIGHT_GAP)).toBe(day);
    expect(localDayNumber(start - 1, MIDNIGHT_GAP)).toBe(day - 1);
  });

  it("o fuso do sistema bate com a meia-noite do Date local", () => {
    const now = Date.UTC(2026, 5, 15, 12);
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);

    expect(startOfLocalDay(localDayNumber(now, systemUtcOffset), systemUtcOffset)).toBe(midnight.getTime());
  });
});
