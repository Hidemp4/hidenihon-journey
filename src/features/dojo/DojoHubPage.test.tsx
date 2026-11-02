import { fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DojoHubPage from "./DojoHubPage";
import { DEFAULT_DOJO_SETTINGS } from "./activities/reflexes/constants";
import { saveLocalDojoSession } from "./activities/reflexes/localRepository";
import type { DojoAttempt } from "./activities/reflexes/types";
import { getActivity } from "./registry";
import { applyActivity, EMPTY_ACTIVITY_LOG, saveActivityLog } from "./shared/activityLog";
import { localDayNumber, systemUtcOffset } from "./shared/calendar";
import { dailyMission } from "./shared/dailyMission";
import { masteryStore } from "./shared/mastery";
import { createMemoryStorage } from "./shared/test/memoryStorage";
import { TestRouter } from "./shared/test/router";

function attempt(index: number, completionMs: number): DojoAttempt {
  return {
    id: `a-${index}`,
    kana: "あ",
    romaji: "a",
    answer: "a",
    alphabet: "hiragana",
    group: "hiragana:a-row",
    outcome: "correct",
    reactionMs: 100,
    completionMs,
    createdAt: new Date(0).toISOString(),
  };
}

function renderHub() {
  render(
    <TestRouter path="/dojo">
      <Routes>
        <Route path="/dojo" element={<DojoHubPage />} />
        <Route path="/dojo/reflexos" element={<p>Arena aberta</p>} />
      </Routes>
    </TestRouter>
  );
}

describe("Hub do Dojô", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mostra o cabeçalho do Dojô e um card por atividade", () => {
    renderHub();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Dojô 道場");
    expect(within(screen.getByRole("list", { name: "Atividades" })).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Desativar áudio" })).toBeInTheDocument();
  });

  it("card pronto é um link para a atividade, com descrição e badge acessíveis", () => {
    saveLocalDojoSession({
      id: "s1",
      settings: DEFAULT_DOJO_SETTINGS,
      startedAt: new Date(0).toISOString(),
      finishedAt: new Date(1).toISOString(),
      attempts: [600, 624, 612, 600, 624].map((ms, index) => attempt(index, ms)),
    });
    renderHub();

    const card = screen.getByRole("link", { name: "Arena de Reflexos 反応" });
    expect(card).toHaveAttribute("href", "/dojo/reflexos");
    expect(card).toHaveAccessibleDescription("Veja o kana e digite o romaji rápido. Melhor média 612ms");

    fireEvent.click(card);
    expect(screen.getByTestId("location")).toHaveTextContent("/dojo/reflexos");
    expect(screen.getByText("Arena aberta")).toBeInTheDocument();
  });

  it("Pergaminhos é um card pronto, com o badge da agenda", () => {
    renderHub();

    const card = screen.getByRole("link", { name: "Pergaminhos 巻物" });
    expect(card).toHaveAttribute("href", "/dojo/pergaminhos");
    expect(card).toHaveAccessibleDescription("Flashcards com revisão espaçada. Nenhuma revisão ainda");
  });

  it("Exame Chunin é um card pronto, com a última nota", () => {
    localStorage.setItem(
      "hidenihon:dojo:exam:v1",
      JSON.stringify({ version: 1, last: { score: 80, total: 10, mode: "round", finishedAt: 1 } })
    );
    renderHub();

    const card = screen.getByRole("link", { name: "Exame Chunin 中忍試験" });
    expect(card).toHaveAttribute("href", "/dojo/exame");
    expect(card).toHaveAccessibleDescription("Quiz de múltipla escolha com 4 alternativas. Última nota 80%");
  });

  it("Selos é um card pronto, com o melhor resultado", () => {
    localStorage.setItem(
      "hidenihon:dojo:seals:v1",
      JSON.stringify({ version: 1, best: { "kana-romaji:hiragana:4x4": { moves: 12, ms: 40_000, stars: 3, finishedAt: 1 } } })
    );
    renderHub();

    const card = screen.getByRole("link", { name: "Selos 印" });
    expect(card).toHaveAttribute("href", "/dojo/selos");
    expect(card).toHaveAccessibleDescription("Jogo da memória com kana e kanji. Melhor 4×4: 12 jogadas");
  });

  it("Pincel é um card pronto, com os kana praticados", () => {
    localStorage.setItem(
      "hidenihon:dojo:brush:v1",
      JSON.stringify({ version: 1, practiced: { "hiragana:あ": { bestScore: 90, lastAt: 1 }, "katakana:ア": { bestScore: 70, lastAt: 2 } } })
    );
    renderHub();

    const card = screen.getByRole("link", { name: "Pincel 筆" });
    expect(card).toHaveAttribute("href", "/dojo/pincel");
    expect(card).toHaveAccessibleDescription("Escreva kana e kanji traço a traço. 2 kana praticados");
  });

  it("o placar do topo vem do mastery store", () => {
    localStorage.setItem(
      "hidenihon:dojo:mastery:v1",
      JSON.stringify({
        version: 1,
        items: {
          "hiragana:あ": { seen: 3, correct: 2, streak: 1, lastSeenAt: 1, box: 1, dueAt: 0, avgMs: 500 },
          "katakana:ア": { seen: 1, correct: 1, streak: 1, lastSeenAt: 1, box: 1, dueAt: null, avgMs: 500 },
        },
      })
    );
    renderHub();

    const stats = screen.getByRole("group", { name: "Resumo do seu progresso" });
    expect(stats).toHaveTextContent("Vistos2");
    expect(stats).toHaveTextContent("Acerto75%");
    // Com os Pergaminhos prontos, o terceiro placar mostra o que venceu (antes mostrava "Respostas").
    expect(stats).toHaveTextContent("Revisar1");
    expect(screen.getByRole("link", { name: "Pergaminhos 巻物" })).toHaveAccessibleDescription(/1 para revisar hoje/);
  });

  it("relê o disco depois que a atividade grava o pendente ao sair (cleanup roda após o hub renderizar)", () => {
    function ActivityThatSavesOnExit() {
      useEffect(() => () => void masteryStore.recordResult("hiragana:あ", "correct", 400), []);
      return <Link to="/dojo">Voltar</Link>;
    }
    render(
      <TestRouter path="/dojo/fake">
        <Routes>
          <Route path="/dojo" element={<DojoHubPage />} />
          <Route path="/dojo/fake" element={<ActivityThatSavesOnExit />} />
        </Routes>
      </TestRouter>
    );

    fireEvent.click(screen.getByRole("link", { name: "Voltar" }));
    expect(screen.getByRole("group", { name: "Resumo do seu progresso" })).toHaveTextContent("Vistos1");
  });

  it("abre normalmente sem localStorage", () => {
    vi.stubGlobal("localStorage", undefined);
    renderHub();

    expect(screen.getByRole("group", { name: "Resumo do seu progresso" })).toHaveTextContent("Acerto—");
    expect(screen.getByRole("link", { name: "Arena de Reflexos 反応" })).toHaveAccessibleDescription(/Nenhuma batalha ainda/);
  });

  it("missão do dia e sequência de dias vêm do registro de atividade (Fase 6)", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.UTC(2026, 10, 1, 15));
    try {
      const today = localDayNumber(Date.now(), systemUtcOffset);
      const [first, second, third] = dailyMission(today);
      let log = applyActivity(EMPTY_ACTIVITY_LOG, { activity: "exam", amount: 3, day: today - 2, sourceId: "a" });
      log = applyActivity(log, { activity: "seals", amount: 1, day: today - 1, sourceId: "b" });
      log = applyActivity(log, { activity: first.activity, amount: 1, day: today, sourceId: "c" });
      log = applyActivity(log, { activity: second.activity, amount: second.target + 5, day: today, sourceId: "d" });
      saveActivityLog(log);
      renderHub();

      const panel = screen.getByRole("region", { name: "1 de 3 tarefas feitas hoje" });
      expect(panel).toHaveTextContent("Sequência: 3 dias");
      expect(panel).toHaveTextContent("Melhor: 3 dias");
      expect(panel).toHaveTextContent("Treino de hoje feito.");

      const tasks = within(screen.getByRole("list", { name: "Tarefas da missão" })).getAllByRole("link");
      expect(tasks).toHaveLength(3);
      expect(tasks[0]).toHaveAttribute("href", getActivity(first.activity).route);
      expect(tasks[0]).toHaveAccessibleName(new RegExp(`^${first.label}\\s*\\(1 de ${first.target}\\)$`));
      expect(tasks[1]).toHaveAccessibleName(new RegExp(`^${second.label}\\s*\\(${second.target} de ${second.target}, concluída\\)$`));
      expect(tasks[2]).toHaveAccessibleName(new RegExp(`^${third.label}\\s*\\(0 de ${third.target}\\)$`));

      // Os cards das atividades da missão ganham a marca (visual; o texto acessível está no painel).
      const card = (id: typeof first.activity) => screen.getByRole("link", { name: `${getActivity(id).name} ${getActivity(id).kanji}` });
      expect(card(second.activity)).toHaveTextContent("Missão ✓");
      expect(card(first.activity)).toHaveTextContent(`Missão 1/${first.target}`);
    } finally {
      vi.useRealTimers();
    }
  });

  it("sem treino hoje nem ontem: sequência zerada e o convite para começar", () => {
    renderHub();
    const panel = screen.getByRole("region", { name: "0 de 3 tarefas feitas hoje" });
    expect(panel).toHaveTextContent("Sequência: 0 dias");
    expect(panel).toHaveTextContent("Qualquer treino hoje começa uma sequência.");
  });
});
