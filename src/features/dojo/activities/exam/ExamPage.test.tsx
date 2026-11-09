import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getKanjiStudyItems } from "@/features/dojo/shared/kanjiDeck";
import { loadMastery } from "@/features/dojo/shared/mastery";
import { getKanaStudyItems } from "@/features/dojo/shared/studyItem";
import { openAdvancedSettings } from "@/features/dojo/shared/test/advancedSettings";
import { createMemoryStorage } from "@/features/dojo/shared/test/memoryStorage";
import { TestRouter } from "@/features/dojo/shared/test/router";
import { progressionStore } from "@/features/dojo/progression/store";
import { AUTO_ADVANCE_MS } from "./constants";
import ExamPage from "./ExamPage";

const HIRAGANA = getKanaStudyItems("hiragana");

function renderExam() {
  render(
    <TestRouter path="/dojo/exame">
      <Routes>
        <Route path="/dojo" element={<p>Hub do Dojô</p>} />
        <Route path="/dojo/exame" element={<ExamPage />} />
      </Routes>
    </TestRouter>
  );
}

const location = () => screen.getByTestId("location").textContent;
const prompt = () => screen.getByRole("heading", { level: 2, name: /^Pergunta \d+:/ });
const options = () => within(screen.getByRole("group", { name: "Alternativas" })).getAllByRole("button");

/** Passos pequenos, cada um no seu `act`. */
function advance(ms: number, step = 50) {
  for (let elapsed = 0; elapsed < ms; elapsed += step) {
    act(() => {
      vi.advanceTimersByTime(Math.min(step, ms - elapsed));
    });
  }
}

function press(key: string) {
  (document.activeElement as HTMLElement | null)?.blur();
  fireEvent.keyDown(document.body, { key });
}

/** Índice da alternativa certa, lendo o kana do enunciado (kana → romaji). */
function correctIndex() {
  const char = prompt().querySelector('[lang="ja"]')?.textContent;
  const item = HIRAGANA.find((candidate) => candidate.char === char);
  if (!item) throw new Error(`kana desconhecido: ${char}`);
  const correct = within(screen.getByRole("group", { name: "Alternativas" })).getByRole("button", { name: item.romaji });
  return { index: options().indexOf(correct), item };
}

/** Responde pelo teclado (1–4) e avança com Enter. */
function answerByKeyboard(correct: boolean) {
  const { index, item } = correctIndex();
  const chosen = correct ? index : (index + 1) % options().length;
  press(String(chosen + 1));
  expect(screen.getByRole("status")).toHaveTextContent(correct ? "Correto!" : `Errou. A resposta era ${item.char} (${item.romaji}).`);
  expect(screen.getByRole("button", { name: /(Próxima|Ver resultado) \(Enter\)/ })).toHaveFocus();
  press("Enter");
}

describe("Exame Chunin (fluxo completo)", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "performance", "Date"],
    });
    vi.stubGlobal("localStorage", createMemoryStorage());
    localStorage.setItem("hidenihon:kana-reaction:audio", "off");
    // XP e troféus de cada teste partem do zero (o store é do módulo; relê o disco novo).
    progressionStore.resetForTests();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("o resultado mostra troféus e XP; a revisão dos erros só dá XP", () => {
    renderExam();
    fireEvent.click(screen.getByRole("button", { name: /Começar exame/ }));
    [true, true, true, true, false, true, true, true, true, false].forEach((correct) => answerByKeyboard(correct));

    // 80% de acerto com resposta na hora, contra a meta do Bronze III (40%): vitória.
    const rewards = screen.getByRole("region", { name: "Recompensas da sessão" });
    expect(rewards).toHaveTextContent(/Vitória · desempenho \d+ \(meta 40\)/);
    expect(within(rewards).getByRole("list", { name: "De onde veio o XP" })).toHaveTextContent("Prática+16");
    expect(screen.getByTestId("session-rewards-announcement")).toHaveTextContent(/^Vitória: \+\d+ troféus\. \+\d+ XP\./);
    const afterExam = progressionStore.getSnapshot().totals;
    expect(afterExam).toMatchObject({ wins: 1 });
    expect(afterExam.trophies).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Revisar só os erros" }));
    while (screen.queryByRole("group", { name: "Alternativas" })) answerByKeyboard(true);
    const review = screen.getByRole("region", { name: "Recompensas da sessão" });
    expect(review).toHaveTextContent("Treino sem troféus");
    expect(review).toHaveTextContent("A revisão dos erros não vale troféus, só XP.");
    expect(progressionStore.getSnapshot().totals).toMatchObject({ trophies: afterExam.trophies, wins: 1 });
    expect(progressionStore.getSnapshot().totals.xp).toBeGreaterThan(afterExam.xp);
  });

  it("rodada de 10 no teclado → resultado → revisar só os erros → última nota no lobby", () => {
    renderExam();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Exame Chunin 中忍試験");
    expect(screen.getByText("Rodada · Hiragana · 10 perguntas")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Começar exame/ }));
    expect(prompt()).toHaveFocus(); // o leitor de tela lê o enunciado
    expect(screen.getByText("Pergunta 1 de 10")).toBeInTheDocument();
    expect(options()).toHaveLength(4);

    const pattern = [true, false, true, true, false, true, true, true, true, true];
    pattern.forEach((correct) => answerByKeyboard(correct));

    expect(screen.getByRole("heading", { name: "Resultado do exame" })).toBeInTheDocument();
    expect(screen.getByText("8 de 10 perguntas")).toBeInTheDocument();
    const misses = screen.getByRole("heading", { name: "Erros" }).nextElementSibling;
    if (!misses) throw new Error("sem lista de erros");
    expect(within(misses as HTMLElement).getAllByRole("listitem")).toHaveLength(2);
    expect(misses).toHaveTextContent(/Você marcou/);

    fireEvent.click(screen.getByRole("button", { name: "Revisar só os erros" }));
    expect(screen.getByText("Revisão dos erros", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText(/Pergunta 1 de [12]/)).toBeInTheDocument();
    while (screen.queryByRole("group", { name: "Alternativas" })) answerByKeyboard(true);
    expect(screen.getByRole("heading", { name: "Revisão dos erros" })).toBeInTheDocument();
    expect(screen.getByText(/de [12] perguntas?/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Concluir" }));
    // A revisão (que tende a 100%) não substitui a nota do exame.
    expect(screen.getByText("Última nota: 80% (Rodada, 10 perguntas)")).toBeInTheDocument();
    const seen = Object.values(loadMastery().items).reduce((sum, record) => sum + record.seen, 0);
    expect(seen).toBeGreaterThanOrEqual(11);
    expect(seen).toBeLessThanOrEqual(12);
  });

  it("sobrevivência: 3 vidas e fim quando acabam", () => {
    renderExam();
    fireEvent.click(screen.getByRole("button", { name: /Sobrevivência/ }));
    expect(screen.queryByRole("group", { name: "Perguntas" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Começar exame/ }));

    expect(screen.getByRole("img", { name: "Vidas: 3 de 3" })).toBeInTheDocument();
    answerByKeyboard(true);
    answerByKeyboard(false);
    expect(screen.getByRole("img", { name: "Vidas: 2 de 3" })).toBeInTheDocument();
    answerByKeyboard(false);
    answerByKeyboard(false);

    expect(screen.getByRole("heading", { name: "Você chegou à pergunta 4" })).toBeInTheDocument();
  });

  it("relâmpago com avanço automático: tempo esgota, mostra a correta e segue sozinho", () => {
    renderExam();
    fireEvent.click(screen.getByRole("button", { name: /Relâmpago/ }));
    fireEvent.click(screen.getByRole("button", { name: "3s" }));
    fireEvent.click(screen.getByRole("switch", { name: /Avançar sozinho/ }));
    fireEvent.click(screen.getByRole("button", { name: /Começar exame/ }));

    const { item } = correctIndex();
    expect(screen.getByText("3s")).toBeInTheDocument();
    advance(3_050);
    expect(screen.getByRole("status")).toHaveTextContent(`Tempo esgotado. A resposta era ${item.char} (${item.romaji}).`);
    expect(screen.getByText("Avançando sozinho…")).toBeInTheDocument();

    advance(AUTO_ADVANCE_MS.wrong + 50);
    expect(screen.getByText("Pergunta 2 de 10")).toBeInTheDocument();

    // Responder antes do tempo: clique na alternativa certa e o avanço automático mais curto.
    fireEvent.click(options()[correctIndex().index]);
    expect(screen.getByRole("status")).toHaveTextContent("Correto!");
    advance(AUTO_ADVANCE_MS.correct + 50);
    expect(screen.getByText("Pergunta 3 de 10")).toBeInTheDocument();
  });

  it("layout fixo: responder e avançar não põem nem tiram blocos; o Encerrar fica no topo, longe das alternativas", () => {
    renderExam();
    fireEvent.click(screen.getByRole("button", { name: /Relâmpago/ }));
    fireEvent.click(screen.getByRole("button", { name: /Começar exame/ }));

    const group = screen.getByRole("group", { name: "Alternativas" });
    const card = group.parentElement;
    if (!card) throw new Error("sem cartão da pergunta");
    const blocks = () => Array.from(card.children).map((element) => `${element.tagName}:${element.getAttribute("role") ?? ""}`);
    const layout = blocks();

    // O "Encerrar" vem antes do enunciado e das alternativas (no topo), não logo abaixo delas.
    const finish = screen.getByRole("button", { name: /Encerrar exame/ });
    expect(finish.compareDocumentPosition(prompt()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(finish.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // O "Próxima" já existe (desativado) antes de responder: responder só o ativa, no mesmo lugar.
    const next = screen.getByRole("button", { name: /Próxima/ });
    expect(next).toBeDisabled();
    fireEvent.click(options()[(correctIndex().index + 1) % 4]);
    expect(blocks()).toEqual(layout); // a barra do tempo deixa o espaço reservado
    expect(screen.getByRole("button", { name: /Próxima/ })).toBe(next);
    expect(next).toBeEnabled();
    expect(next).toHaveFocus();

    fireEvent.click(next);
    expect(screen.getByText("Pergunta 2 de 10")).toBeInTheDocument();
    expect(blocks()).toEqual(layout);
    expect(screen.getByRole("button", { name: /Próxima/ })).toBe(next);
    expect(next).toBeDisabled();

    // Encerrar pelo botão (não só pelo Esc) leva ao resultado.
    fireEvent.click(finish);
    expect(screen.getByRole("heading", { name: "Resultado do exame" })).toBeInTheDocument();
  });

  it("Esc encerra a rodada (resultado) e, no resultado, volta ao Dojô", () => {
    renderExam();
    fireEvent.click(screen.getByRole("button", { name: /Começar exame/ }));
    answerByKeyboard(true);

    press("Escape");
    expect(location()).toBe("/dojo/exame");
    expect(screen.getByText("1 de 1 pergunta")).toBeInTheDocument();

    press("Escape");
    expect(location()).toBe("/dojo");
  });

  it("sair pelo '← Dojô' no meio grava as respostas no domínio (sem virar 'última nota')", () => {
    renderExam();
    fireEvent.click(screen.getByRole("button", { name: /Começar exame/ }));
    answerByKeyboard(true);
    answerByKeyboard(false);

    fireEvent.click(screen.getByRole("link", { name: "Voltar ao Dojô" }));
    expect(location()).toBe("/dojo");
    expect(Object.values(loadMastery().items).reduce((sum, record) => sum + record.seen, 0)).toBe(2);
    expect(localStorage.getItem("hidenihon:dojo:exam:v1") ?? "").not.toContain('"last":{');
  });

  it("Kanji N5: quiz de significado no teclado, com a resposta completa no erro", () => {
    renderExam();
    fireEvent.click(screen.getByRole("button", { name: /Kanji N5/ }));
    expect(screen.getByRole("button", { name: "Kanji → significado" })).toHaveAttribute("aria-pressed", "true");
    openAdvancedSettings();
    fireEvent.click(screen.getByRole("button", { name: "Corpo" }));
    expect(screen.getByText("Rodada · Kanji N5 · 10 perguntas")).toBeInTheDocument();
    expect(screen.getByText("5 kanji no baralho")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Começar exame/ }));

    const char = prompt().querySelector('[lang="ja"]')?.textContent;
    const item = getKanjiStudyItems().find((candidate) => candidate.char === char);
    if (!item) throw new Error(`kanji desconhecido: ${char}`);
    expect(prompt()).toHaveTextContent("Qual é o significado?");
    expect(options()).toHaveLength(4);

    const correct = options().findIndex((button) => button.textContent?.includes(item.meaning));
    press(String(((correct + 1) % 4) + 1));
    expect(screen.getByRole("status")).toHaveTextContent(`Errou. A resposta era ${item.char} (${item.meanings.join(", ")}).`);
    press("Enter");
    press("Escape");
    expect(Object.keys(loadMastery().items)).toEqual([`kanji:${item.char}`]);
  });
});
