import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TestRouter } from "../shared/test/router";
import { RankCard } from "./components/RankCard";
import { SessionRewards } from "./components/SessionRewards";
import type { SessionSummary } from "./match";
import { RemoteError, type LeaderboardRow } from "./remote";
import RankingPage from "./RankingPage";
import { progressionStore } from "./store";

const remote = vi.hoisted(() => ({ enabled: false, leaderboard: vi.fn() }));

vi.mock("./remote", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./remote")>();
  return {
    ...actual,
    isRemoteEnabled: () => remote.enabled,
    fetchLeaderboard: (...args: unknown[]) => remote.leaderboard(...args),
    fetchOwnTotals: async () => null,
    pushResult: async () => {
      throw new actual.RemoteError("network", "offline");
    },
  };
});

const UTC = () => 0;
const NOW = Date.UTC(2026, 10, 6, 15);

function exam(sessionId: string, performance: number, items = 20): SessionSummary {
  return { activity: "exam", sessionId, finished: true, items, practiceXp: 30, completed: true, ranked: { activity: "exam", performance, distinct: 15, difficulty: 1 } };
}

function record(summary: SessionSummary) {
  let reward: ReturnType<typeof progressionStore.recordSession> = null;
  act(() => {
    reward = progressionStore.recordSession(summary, { now: NOW, offsetAt: UTC });
  });
  return reward;
}

const row = (patch: Partial<LeaderboardRow>): LeaderboardRow => ({ position: 1, name: "Ana", trophies: 0, xp: 0, isMe: false, inTop: true, ...patch });

beforeEach(() => {
  localStorage.clear();
  remote.enabled = false;
  remote.leaderboard.mockReset();
  progressionStore.resetForTests();
});

afterEach(() => {
  cleanup();
  progressionStore.resetForTests();
});

describe("cartão da liga no hub", () => {
  it("liga, troféus, nível, meta e o link do ranking; atualiza quando uma sessão grava", () => {
    render(
      <TestRouter path="/dojo">
        <RankCard />
      </TestRouter>
    );
    const card = screen.getByRole("region", { name: "Bronze III" });
    expect(card).toHaveTextContent("0 troféus");
    expect(card).toHaveTextContent("Faltam 100 troféus para Bronze II");
    expect(card).toHaveTextContent("Nível 1");
    expect(card).toHaveTextContent("desempenho de 40% ou mais");
    expect(within(card).getByRole("link", { name: /Ver ranking/ })).toHaveAttribute("href", "/dojo/ranking");

    record(exam("r1", 100)); // vitória cheia: +30
    expect(screen.getByRole("region", { name: "Bronze III" })).toHaveTextContent("30 troféus");
  });
});

describe("recompensas na tela de resultado", () => {
  function renderRewards(sessionId: string) {
    render(
      <TestRouter path="/dojo/exame">
        <SessionRewards activity="exam" sessionId={sessionId} />
      </TestRouter>
    );
  }

  it("aparece quando a atividade grava: troféus, desempenho × meta, XP de cada fonte e anúncio", () => {
    renderRewards("r1");
    const announcement = screen.getByTestId("session-rewards-announcement");
    expect(announcement).toHaveTextContent("");
    expect(screen.queryByRole("region", { name: "Recompensas da sessão" })).not.toBeInTheDocument();

    record(exam("r1", 100));
    const panel = screen.getByRole("region", { name: "Recompensas da sessão" });
    expect(panel).toHaveTextContent("+30");
    expect(panel).toHaveTextContent("Vitória · desempenho 100 (meta 40)");
    const sources = within(within(panel).getByRole("list", { name: "De onde veio o XP" })).getAllByRole("listitem");
    // Sem treino gravado antes, a sequência é 0: o bônus do dia fica no básico (+20).
    expect(sources.map((item) => item.textContent)).toEqual(["Prática+30", "Sessão concluída+10", "Vitória+15", "Primeiro treino do dia+20"]);
    expect(announcement).toHaveTextContent("Vitória: +30 troféus. +75 XP.");
    expect(within(panel).getByRole("link", { name: /Ver ranking/ })).toHaveAttribute("href", "/dojo/ranking");
  });

  it("subir de divisão e de nível vira destaque", () => {
    progressionStore.recordSession(exam("antes-1", 100), { now: NOW, offsetAt: UTC });
    progressionStore.recordSession(exam("antes-2", 100), { now: NOW, offsetAt: UTC });
    progressionStore.recordSession(exam("antes-3", 100), { now: NOW, offsetAt: UTC }); // 90 troféus
    renderRewards("r4");
    record(exam("r4", 100));
    expect(screen.getByText("Subiu: Bronze II!")).toBeInTheDocument();
    expect(screen.getByTestId("session-rewards-announcement")).toHaveTextContent("Subiu para Bronze II.");
  });

  it("sessão curta: explica por que não valeu troféus", () => {
    renderRewards("curta");
    record(exam("curta", 100, 5));
    const panel = screen.getByRole("region", { name: "Recompensas da sessão" });
    expect(panel).toHaveTextContent("Treino sem troféus");
    expect(panel).toHaveTextContent("Partida curta: vale troféus a partir de 10 respostas.");
  });
});

describe("página do ranking", () => {
  function renderPage() {
    render(
      <TestRouter path="/dojo/ranking">
        <RankingPage />
      </TestRouter>
    );
  }

  it("sem servidor: avisa, e mostra você, a escada, as regras e o histórico", () => {
    progressionStore.recordSession(exam("r1", 100), { now: NOW, offsetAt: UTC });
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: /Ranking/ })).toBeInTheDocument();
    expect(screen.getByText(/O ranking online não está ligado neste app/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Bronze III" })).toHaveTextContent("30 troféus");
    expect(within(screen.getByRole("group", { name: "Suas partidas" })).getByText("Vitórias").nextSibling).toHaveTextContent("1");

    const ladder = within(screen.getByRole("list", { name: "Ligas, da mais alta para a primeira" })).getAllByRole("listitem");
    const names = ["Lendário", "Titã", "Imortal", "Diamante", "Platina", "Ouro", "Prata", "Bronze"];
    expect(ladder.map((item) => names.find((name) => item.textContent?.includes(name)))).toEqual(names);
    expect(ladder[7]).toHaveAttribute("aria-current", "true");
    expect(ladder[7]).toHaveTextContent("Você está aqui");

    expect(screen.getByText("Exame Chunin: a partir de 10 respostas.")).toBeInTheDocument();
    expect(screen.getByText("Pergaminhos, revisão dos erros e Estudar ordem só dão XP.")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Últimas sessões" })).getByRole("listitem")).toHaveTextContent("Vitória (desempenho 100, meta 40)");
  });

  it("com servidor: classificação com a sua linha marcada, mesmo fora dos primeiros", async () => {
    remote.enabled = true;
    remote.leaderboard.mockResolvedValue([
      row({ position: 1, name: "Bia", trophies: 5200, xp: 90_000 }),
      row({ position: 2, name: "Caio", trophies: 1200, xp: 5_000 }),
      row({ position: 57, name: "Ana", trophies: 30, xp: 80, isMe: true, inTop: false }),
    ]);
    renderPage();

    const board = await screen.findByRole("list", { name: "Classificação" });
    const items = within(board).getAllByRole("listitem");
    expect(items).toHaveLength(3); // o "…" é decorativo
    expect(items[0]).toHaveTextContent("1ºBiaLendário · nível");
    expect(items[0]).toHaveTextContent("5.200 troféus");
    expect(items[2]).toHaveTextContent(/^57º.*AnaVocêBronze III · nível 1/);
    expect(items[1]).not.toHaveTextContent("Você");
    expect(board).toHaveTextContent("…");
  });

  it("sem conexão: avisa e deixa tentar de novo; SQL não aplicado: explica", async () => {
    remote.enabled = true;
    remote.leaderboard.mockRejectedValueOnce(new RemoteError("network", "Failed to fetch")).mockResolvedValueOnce([row({ name: "Bia", isMe: true })]);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Tentar de novo/ }));
    expect(await screen.findByRole("list", { name: "Classificação" })).toHaveTextContent("Bia");
    cleanup();

    remote.leaderboard.mockRejectedValueOnce(new RemoteError("unavailable", "Could not find the function"));
    renderPage();
    expect(await screen.findByText(/O ranking online ainda não foi ativado no servidor/)).toBeInTheDocument();
  });
});
