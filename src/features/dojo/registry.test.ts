import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { comingSoonBadge, DOJO_ACTIVITIES, getActivity } from "./registry";
import { createMemoryStorage } from "./shared/test/memoryStorage";

describe("registro de atividades", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tem as cinco atividades combinadas, na ordem do hub", () => {
    expect(DOJO_ACTIVITIES.map(({ id, name, kanji, route }) => ({ id, name, kanji, route }))).toEqual([
      { id: "scrolls", name: "Pergaminhos", kanji: "巻物", route: "/dojo/pergaminhos" },
      { id: "reflexes", name: "Arena de Reflexos", kanji: "反応", route: "/dojo/reflexos" },
      { id: "exam", name: "Exame Chunin", kanji: "中忍試験", route: "/dojo/exame" },
      { id: "seals", name: "Selos", kanji: "印", route: "/dojo/selos" },
      { id: "brush", name: "Pincel", kanji: "筆", route: "/dojo/pincel" },
    ]);
  });

  it("ids e rotas são únicos e toda atividade tem descrição curta", () => {
    expect(new Set(DOJO_ACTIVITIES.map((activity) => activity.id)).size).toBe(DOJO_ACTIVITIES.length);
    expect(new Set(DOJO_ACTIVITIES.map((activity) => activity.route)).size).toBe(DOJO_ACTIVITIES.length);
    for (const activity of DOJO_ACTIVITIES) {
      expect(activity.description.length).toBeGreaterThan(0);
      expect(activity.description.length).toBeLessThanOrEqual(48);
    }
  });

  it("desde a Fase 4, as cinco atividades estão prontas", () => {
    expect(DOJO_ACTIVITIES.filter((activity) => activity.status === "ready").map((activity) => activity.id)).toEqual([
      "scrolls",
      "reflexes",
      "exam",
      "seals",
      "brush",
    ]);
    // O estado "em breve" continua disponível para atividades futuras.
    expect(comingSoonBadge()).toEqual({ text: "Em breve", tone: "muted" });
  });

  it("badges sem histórico", () => {
    expect(getActivity("reflexes").getBadge({ now: 0 })).toEqual({ text: "Nenhuma batalha ainda", tone: "neutral" });
    expect(getActivity("scrolls").getBadge({ now: 0 })).toEqual({ text: "Nenhuma revisão ainda", tone: "neutral" });
    expect(getActivity("exam").getBadge({ now: 0 })).toEqual({ text: "Nenhum exame ainda", tone: "neutral" });
    expect(getActivity("seals").getBadge({ now: 0 })).toEqual({ text: "Nenhuma partida ainda", tone: "neutral" });
    expect(getActivity("brush").getBadge({ now: 0 })).toEqual({ text: "Nenhum kana praticado", tone: "neutral" });
  });
});
