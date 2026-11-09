import { fireEvent, render, screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localDayNumber, startOfLocalDay, systemUtcOffset } from "@/features/dojo/shared/calendar";
import { loadMastery } from "@/features/dojo/shared/mastery";
import { getKanaStudyItems } from "@/features/dojo/shared/studyItem";
import { openAdvancedSettings } from "@/features/dojo/shared/test/advancedSettings";
import { createMemoryStorage } from "@/features/dojo/shared/test/memoryStorage";
import { TestRouter } from "@/features/dojo/shared/test/router";
import { loadIntroducedToday } from "./scrollsRepository";
import ScrollsPage from "./ScrollsPage";

const NOON = Date.UTC(2026, 9, 31, 15);
const DAY = 86_400_000;
const HIRAGANA = getKanaStudyItems("hiragana");

/** Meia-noite local daqui a `days` dias, no fuso da máquina que roda o teste (é o que a página usa). */
function midnight(days: number, from = NOON) {
  return startOfLocalDay(localDayNumber(from, systemUtcOffset) + days, systemUtcOffset);
}

function renderScrolls() {
  return render(
    <TestRouter path="/dojo/pergaminhos">
      <Routes>
        <Route path="/dojo" element={<p>Hub do Dojô</p>} />
        <Route path="/dojo/pergaminhos" element={<ScrollsPage />} />
      </Routes>
    </TestRouter>
  );
}

const location = () => screen.getByTestId("location").textContent;
const card = () => screen.getByRole("button", { name: /Virar carta|Carta virada/ });

/** Tecla "solta" na página (fora de qualquer botão), como quem usa só o teclado. */
function press(key: string) {
  (document.activeElement as HTMLElement | null)?.blur();
  fireEvent.keyDown(document.body, { key });
}

function flipAndPress(grade: "1" | "2" | "3") {
  press(" ");
  press(grade);
}

describe("Pergaminhos (fluxo completo)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOON);
    vi.stubGlobal("localStorage", createMemoryStorage());
    localStorage.setItem("hidenihon:kana-reaction:audio", "off");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("revisão só no teclado: virar, 3 notas, desfazer, resumo e agenda gravada", () => {
    const view = renderScrolls();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Pergaminhos 巻物");
    fireEvent.click(screen.getByRole("button", { name: "5 novos" }));
    expect(screen.getByRole("heading", { level: 2, name: "5 pergaminhos" })).toBeInTheDocument();
    expect(screen.getByText("0 para revisar · 5 novos hoje")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Começar revisão/ }));
    expect(card()).toHaveFocus(); // a carta recebe o foco: Espaço/Enter viram direto
    expect(card()).toHaveTextContent("あ");
    expect(card()).toHaveTextContent("Qual é o romaji?");
    expect(screen.getByRole("progressbar", { name: "Progresso da sessão" })).toHaveAttribute("aria-valuenow", "0");

    // Só 3 notas, e todas esperam a carta virar.
    const grades = within(screen.getByRole("group", { name: "Como foi?" })).getAllByRole("button");
    expect(grades.map((button) => button.textContent)).toEqual(["1Erreivolta na próxima sessão", "2Acerteivolta amanhã", "3Fácilvolta em 3 dias"]);
    expect(grades.every((button) => button.hasAttribute("disabled"))).toBe(true);

    // Enter (fora de botão) vira; a resposta é anunciada.
    press("Enter");
    expect(screen.getByRole("status")).toHaveTextContent("Resposta: あ, a.");
    expect(screen.getByRole("button", { name: /Acertei/ })).toBeEnabled();
    press("2"); // あ: Acertei → amanhã

    flipAndPress("1"); // い: Errei → próxima sessão (não repete agora)
    flipAndPress("3"); // う: Fácil → em 3 dias
    flipAndPress("1"); // え: Errei
    expect(card()).toHaveTextContent("お"); // a errada não voltou para o fim da fila
    expect(screen.getByText("Pergaminho 5 de 5")).toBeInTheDocument();
    flipAndPress("2"); // お: Acertei…

    // …e Z no resumo desfaz: a carta volta virada para trocar a nota.
    expect(screen.getByRole("heading", { name: "Pergaminhos guardados" })).toBeInTheDocument();
    press("z");
    expect(card()).toHaveTextContent("お");
    expect(screen.getByRole("status")).toHaveTextContent("Resposta: お, o.");
    press("3"); // お: Fácil

    // Resumo
    const summary = screen.getByRole("heading", { name: "Pergaminhos guardados" }).closest("section");
    if (!summary) throw new Error("sem resumo");
    expect(summary).toHaveTextContent("Errei2Acertei1Fácil2");
    expect(summary).not.toHaveTextContent(/caixa|Difícil/i);
    expect(within(summary).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "na próxima sessão2 cartas",
      "amanhã1 carta",
      "em 3 dias2 cartas",
    ]);

    // Esc no resumo volta ao Dojô e a sessão é gravada ao sair.
    press("Escape");
    expect(location()).toBe("/dojo");

    const { items } = loadMastery();
    expect(items["hiragana:あ"]).toMatchObject({ dueAt: midnight(1), seen: 1, correct: 1 });
    expect(items["hiragana:い"]).toMatchObject({ dueAt: midnight(0), seen: 1, correct: 0 });
    expect(items["hiragana:う"]).toMatchObject({ dueAt: midnight(3), seen: 1, correct: 1 });
    expect(items["hiragana:え"]).toMatchObject({ dueAt: midnight(0) });
    expect(items["hiragana:お"]).toMatchObject({ dueAt: midnight(3), seen: 1 });
    expect(loadIntroducedToday(localDayNumber(NOON, systemUtcOffset))).toBe(5);
    view.unmount();

    // O próximo teste, no mesmo dia: só as que errou voltam (e o limite de novos já foi).
    renderScrolls();
    expect(screen.getByText("2 para revisar · 0 novos hoje")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Começar revisão/ }));
    expect(card()).toHaveTextContent("い");
    expect(card()).toHaveTextContent("Revisão");
    flipAndPress("2");
    expect(card()).toHaveTextContent("え");
  });

  it("trocar de carta não mostra a resposta da próxima: a carta nova entra montada do zero, sem desvirar", () => {
    renderScrolls();
    fireEvent.click(screen.getByRole("button", { name: /Começar revisão/ }));
    press(" ");
    const before = card();
    expect(before.querySelector("[data-flipper]")?.className).toContain("rotateY(180deg)");

    press("2");
    const after = card();
    // Sem a troca de nó, a mesma carta desviraria em 500 ms com o verso (o romaji de い) à vista.
    expect(after).not.toBe(before);
    expect(before.isConnected).toBe(false);
    expect(after.querySelector("[data-flipper]")?.className).not.toContain("rotateY(180deg)");
    expect(after.querySelector('[data-face="back"]')).toHaveAttribute("aria-hidden", "true");
    expect(after).not.toHaveAccessibleName(/Família/);
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("no dia seguinte: vencidos (mais atrasados primeiro) e mais novos", () => {
    const view = renderScrolls();
    fireEvent.click(screen.getByRole("button", { name: "5 novos" }));
    fireEvent.click(screen.getByRole("button", { name: /Começar revisão/ }));
    flipAndPress("2"); // あ → amanhã
    flipAndPress("1"); // い → hoje
    fireEvent.click(screen.getByRole("button", { name: /Encerrar sessão/ }));
    fireEvent.click(screen.getByRole("button", { name: "Concluir" }));
    view.unmount();

    vi.setSystemTime(NOON + DAY);
    renderScrolls();

    // い venceu ontem, あ hoje; e o limite de novos zerou com a virada do dia.
    expect(screen.getByText("2 para revisar · 5 novos hoje")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Começar revisão/ }));
    expect(card()).toHaveTextContent("い");
    expect(card()).toHaveTextContent("Revisão");
    flipAndPress("2");
    expect(card()).toHaveTextContent("あ");
    flipAndPress("2");
    expect(card()).toHaveTextContent("う");
    expect(card()).toHaveTextContent("Novo");
  });

  it("sem nada para hoje: tela de 'tudo revisado' e treino livre, que não muda a agenda", () => {
    const tomorrow = midnight(1);
    localStorage.setItem(
      "hidenihon:dojo:mastery:v1",
      JSON.stringify({
        version: 1,
        items: Object.fromEntries(HIRAGANA.map((item) => [item.id, { seen: 2, correct: 2, streak: 2, lastSeenAt: 1, box: 3, dueAt: tomorrow, avgMs: 500 }])),
      })
    );
    renderScrolls();

    expect(screen.getByRole("heading", { level: 2, name: "Tudo revisado por hoje" })).toBeInTheDocument();
    expect(screen.getByText("Próxima revisão amanhã.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Começar revisão/ })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Resumo da agenda" })).toHaveTextContent(`Na agenda${HIRAGANA.length}`);

    fireEvent.click(screen.getByRole("button", { name: /Treino livre/ }));
    expect(screen.getByText("Pergaminho 1 de 20")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Acertei/ })).toHaveTextContent("sem agenda");

    fireEvent.click(card()); // toque/clique também vira
    fireEvent.click(screen.getByRole("button", { name: /Errei/ }));
    flipAndPress("3");

    // Esc na sessão encerra (vai ao resumo), não sai da atividade.
    press("Escape");
    expect(location()).toBe("/dojo/pergaminhos");
    expect(screen.getByRole("heading", { name: "Treino livre concluído" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Concluir" }));

    const records = Object.values(loadMastery().items);
    expect(records.every((record) => record.box === 3 && record.dueAt === tomorrow)).toBe(true);
    expect(records.reduce((sum, record) => sum + record.seen, 0)).toBe(HIRAGANA.length * 2 + 2);
  });

  it("sair pelo '← Dojô' no meio da sessão grava as notas já dadas", () => {
    renderScrolls();
    fireEvent.click(screen.getByRole("button", { name: /Começar revisão/ }));
    flipAndPress("2");
    flipAndPress("3");

    fireEvent.click(screen.getByRole("link", { name: "Voltar ao Dojô" }));
    expect(location()).toBe("/dojo");
    expect(loadMastery().items["hiragana:い"]).toMatchObject({ box: 3, dueAt: midnight(3) });
    expect(loadIntroducedToday(localDayNumber(NOON, systemUtcOffset))).toBe(2);
  });

  it("direção fixa (kana → romaji); Esc no lobby volta ao Dojô; trocar configuração muda a fila e fica salva", () => {
    renderScrolls();
    expect(screen.queryByRole("group", { name: "Direção" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Romaji → kana|Misto/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Katakana/ }));
    fireEvent.click(screen.getByRole("button", { name: /Começar revisão/ }));
    // A frente é sempre o kana; o verso (o romaji) está no DOM, mas aria-hidden até virar.
    expect(card()).toHaveAccessibleName(/Virar carta\..*ア.*Qual é o romaji\?/);
    expect(card()).not.toHaveAccessibleName(/Família/);
    press(" ");
    expect(screen.getByRole("status")).toHaveTextContent("Resposta: ア, a.");
    expect(card()).toHaveAccessibleName(/Carta virada\..*ア.*a.*Família/);

    fireEvent.click(screen.getByRole("button", { name: /Encerrar sessão/ }));
    expect(screen.getByRole("heading", { level: 2, name: /pergaminhos/ })).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem("hidenihon:dojo:scrolls:v1") ?? "null").settings;
    expect(saved).toMatchObject({ alphabet: "katakana" });
    expect(saved).not.toHaveProperty("direction");

    press("Escape");
    expect(location()).toBe("/dojo");
  });

  it("direção antiga salva (romaji → kana) é ignorada: a carta mostra o kana na frente", () => {
    localStorage.setItem(
      "hidenihon:dojo:scrolls:v1",
      JSON.stringify({ version: 1, settings: { content: "kana", alphabet: "hiragana", selectedGroupIds: [], direction: "romaji-to-kana", newPerDay: 10 } })
    );
    renderScrolls();
    fireEvent.click(screen.getByRole("button", { name: /Começar revisão/ }));
    expect(card()).toHaveAccessibleName(/Virar carta\..*あ.*Qual é o romaji\?/);
  });

  it("Kanji N5: kanji na frente, leituras em kana e romaji no verso; o domínio usa ids kanji:", () => {
    renderScrolls();
    fireEvent.click(screen.getByRole("button", { name: /Kanji N5/ }));
    // Alfabeto não se aplica a kanji; os grupos viram temas; não há escolha de direção.
    expect(screen.queryByRole("group", { name: "Alfabeto" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Direção" })).not.toBeInTheDocument();
    openAdvancedSettings();
    expect(screen.getByRole("heading", { name: "Temas de kanji" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Corpo" }));
    fireEvent.click(screen.getByRole("button", { name: "5 novos" }));

    fireEvent.click(screen.getByRole("button", { name: /Começar revisão/ }));
    expect(card()).toHaveTextContent("口");
    expect(card()).toHaveAccessibleName(/Virar carta\..*口.*Como se lê\?/);
    expect(card()).not.toHaveAccessibleName(/kuchi|boca/);
    press("Enter");
    expect(screen.getByRole("status")).toHaveTextContent("Resposta: 口, On: コウ (kou), ク (ku). Kun: くち (kuchi). Significado: boca.");
    const back = card().querySelector('[data-face="back"]');
    expect(back).toHaveTextContent("OnコウkouクkuKunくちkuchiSignificado: boca");
    press("2");
    expect(card()).toHaveTextContent("目");

    fireEvent.click(screen.getByRole("link", { name: "Voltar ao Dojô" }));
    expect(Object.keys(loadMastery().items)).toEqual(["kanji:口"]);
    expect(JSON.parse(localStorage.getItem("hidenihon:dojo:scrolls:v1") ?? "{}").settings).toMatchObject({ content: "kanji", selectedGroupIds: ["kanji:body"] });
  });
});
