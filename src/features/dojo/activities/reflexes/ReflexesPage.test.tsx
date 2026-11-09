import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadActivityLog } from "@/features/dojo/shared/activityLog";
import { getKanaDeck } from "@/features/dojo/shared/kanaDeck";
import { loadMastery } from "@/features/dojo/shared/mastery";
import { createMemoryStorage } from "@/features/dojo/shared/test/memoryStorage";
import { TestRouter } from "@/features/dojo/shared/test/router";
import {
  BATTLE_START_DELAY_MS,
  COUNTDOWN_GO_MS,
  COUNTDOWN_START,
  COUNTDOWN_STEP_MS,
  ENTER_ARENA_DELAY_MS,
} from "./constants";
import { loadLocalDojoSessions } from "./localRepository";
import ReflexesPage from "./ReflexesPage";

const AUDIO_KEY = "hidenihon:kana-reaction:audio";
const HIRAGANA = getKanaDeck("hiragana");

/** Passos pequenos, cada um no seu `act`: timers que agendam outros timers rodam na ordem certa. */
function advance(ms: number, step = 50) {
  for (let elapsed = 0; elapsed < ms; elapsed += step) {
    act(() => {
      vi.advanceTimersByTime(Math.min(step, ms - elapsed));
    });
  }
}

function renderArena() {
  render(
    <TestRouter path="/dojo/reflexos">
      <Routes>
        <Route path="/dojo" element={<p>Hub do Dojô</p>} />
        <Route path="/dojo/reflexos" element={<ReflexesPage />} />
      </Routes>
    </TestRouter>
  );
}

const location = () => screen.getByTestId("location").textContent;

/** `persisted: true` = a página foi para o cache de voltar/avançar (pode voltar com o treino rolando). */
function firePageHide(persisted: boolean) {
  const event = new Event("pagehide");
  Object.defineProperty(event, "persisted", { value: persisted });
  act(() => {
    window.dispatchEvent(event);
  });
}

function enterLobbyAndStart(roundSize = "10 kana") {
  fireEvent.click(screen.getByRole("button", { name: /Entrar na arena/ }));
  fireEvent.click(screen.getByRole("button", { name: roundSize }));
  fireEvent.click(screen.getByRole("button", { name: /Iniciar batalha/ }));
}

function runCountdown() {
  advance(COUNTDOWN_STEP_MS * COUNTDOWN_START + COUNTDOWN_GO_MS + 50);
}

function currentKana() {
  const kana = HIRAGANA.find((item) => screen.queryByText(item.char) !== null);
  if (!kana) throw new Error("nenhum kana na tela");
  return kana;
}

/** Lê o kana na tela, digita o romaji certo (ou um errado) e confirma com Enter. */
function answerCurrent(correct = true) {
  advance(50); // dois frames: o kana é marcado como "mostrado" só depois de pintar
  const kana = currentKana();
  const input = screen.getByRole("textbox");

  fireEvent.change(input, { target: { value: correct ? kana.romaji : "xq" } });
  fireEvent.keyDown(input, { key: "Enter" });
  return kana;
}

/** `pointer: fine` = computador (mouse/trackpad); sem isso o jsdom se comporta como celular. */
function stubPointer(fine: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: fine && query === "(pointer: fine)",
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

function startBattle() {
  renderArena();
  enterLobbyAndStart();
  runCountdown();
  advance(50);
}

const attemptsSoFar = () => screen.getByText(/^\d+\/10$/).textContent;

describe("Arena de Reflexos dentro do Dojô (fluxo completo)", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "Date"],
    });
    vi.stubGlobal("localStorage", createMemoryStorage());
    // Áudio desligado: sem as pausas de 1,5s para casar com a trilha (testadas à parte abaixo).
    localStorage.setItem(AUDIO_KEY, "off");
  });

  afterEach(() => {
    // Desmonta antes de restaurar os mocks: o cleanup do áudio chama pause(), que o jsdom não implementa.
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("abertura → lobby → contagem → 10 acertos → resultado salvo no histórico e no mastery", () => {
    renderArena();

    // Abertura em tela cheia, já com o caminho de volta.
    expect(screen.getByRole("link", { name: "Voltar ao Dojô" })).toHaveAttribute("href", "/dojo");
    fireEvent.click(screen.getByRole("button", { name: /Entrar na arena/ }));

    // Lobby: casca (h1 = atividade) + textos de sempre.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Arena de Reflexos 反応");
    expect(screen.getByRole("heading", { level: 2, name: "Monte sua missão" })).toBeInTheDocument();
    expect(screen.getByText("Sala de preparação")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Resumo de desempenho" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "10 kana" }));
    fireEvent.click(screen.getByRole("button", { name: /Iniciar batalha/ }));
    expect(screen.getByText("Prepare-se para a batalha")).toBeInTheDocument();

    runCountdown();
    expect(screen.getByText("Batalha em andamento")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progresso da rodada" })).toHaveAttribute("aria-valuenow", "0");

    for (let index = 0; index < 10; index += 1) answerCurrent();

    expect(screen.getByRole("heading", { name: "Sessão finalizada" })).toBeInTheDocument();
    expect(screen.getByText("Resultado da missão")).toBeInTheDocument();
    expect(screen.getByText("10/10")).toBeInTheDocument();

    const [saved] = loadLocalDojoSessions();
    expect(saved.attempts).toHaveLength(10);
    expect(saved.attempts.every((attempt) => attempt.outcome === "correct")).toBe(true);

    const mastery = loadMastery();
    const records = Object.values(mastery.items);
    expect(records.reduce((sum, record) => sum + record.seen, 0)).toBe(10);
    expect(records.every((record) => record.correct === record.seen && record.box === 1 && record.dueAt === null)).toBe(true);
    expect(Object.keys(mastery.items).every((id) => id.startsWith("hiragana:"))).toBe(true);
    expect(mastery.recentSources).toEqual([saved.id]);
    // Fase 6: a batalha conta para a sequência e a missão do dia (10 kana respondidos hoje).
    const today = loadActivityLog().days[0];
    expect(today.counts).toEqual({ reflexes: 10 });
  });

  it("Esc: ignorado na contagem, encerra a sessão no treino e só depois volta ao Dojô", () => {
    renderArena();
    enterLobbyAndStart();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(location()).toBe("/dojo/reflexos");
    expect(screen.getByText("Prepare-se para a batalha")).toBeInTheDocument();

    runCountdown();
    answerCurrent();
    answerCurrent(false);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(location()).toBe("/dojo/reflexos");
    expect(screen.getByRole("heading", { name: "Sessão finalizada" })).toBeInTheDocument();
    expect(loadLocalDojoSessions()[0].attempts.map((attempt) => attempt.outcome)).toEqual(["correct", "wrong"]);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(location()).toBe("/dojo");
    expect(screen.getByText("Hub do Dojô")).toBeInTheDocument();
  });

  it("sair pelo '← Dojô' no meio da batalha salva as respostas dadas até ali", () => {
    renderArena();
    enterLobbyAndStart();
    runCountdown();
    answerCurrent();
    answerCurrent(false);
    answerCurrent();

    fireEvent.click(screen.getByRole("link", { name: "Voltar ao Dojô" }));
    expect(location()).toBe("/dojo");

    const [saved] = loadLocalDojoSessions();
    expect(saved.attempts.map((attempt) => attempt.outcome)).toEqual(["correct", "wrong", "correct"]);
    expect(saved.finishedAt).not.toBeNull();

    const mastery = loadMastery();
    expect(Object.values(mastery.items).reduce((sum, record) => sum + record.seen, 0)).toBe(3);
    expect(mastery.recentSources).toEqual([saved.id]);
  });

  it("fechar ou recarregar a aba grava a sessão; ir para o cache de voltar/avançar não", () => {
    renderArena();
    enterLobbyAndStart();
    runCountdown();
    answerCurrent();
    answerCurrent(false);

    firePageHide(true);
    expect(loadLocalDojoSessions()).toEqual([]);

    firePageHide(false);
    expect(loadLocalDojoSessions()[0].attempts.map((attempt) => attempt.outcome)).toEqual(["correct", "wrong"]);
    expect(Object.values(loadMastery().items).reduce((sum, record) => sum + record.seen, 0)).toBe(2);
  });

  it("sair antes da primeira resposta não grava sessão vazia", () => {
    renderArena();
    enterLobbyAndStart();
    runCountdown();

    fireEvent.click(screen.getByRole("link", { name: "Voltar ao Dojô" }));
    expect(location()).toBe("/dojo");
    expect(loadLocalDojoSessions()).toEqual([]);
    expect(loadMastery().items).toEqual({});
  });

  it("sessão encerrada normalmente não é gravada de novo ao sair", () => {
    renderArena();
    enterLobbyAndStart();
    runCountdown();
    answerCurrent();
    fireEvent.click(screen.getByRole("button", { name: /Encerrar sessão/ }));

    fireEvent.click(screen.getByRole("link", { name: "Voltar ao Dojô" }));
    expect(loadLocalDojoSessions()).toHaveLength(1);
    expect(Object.values(loadMastery().items).reduce((sum, record) => sum + record.seen, 0)).toBe(1);
  });

  it("digitar não confirma sozinho: o erro de digitação dá para apagar, e só o Enter vale", () => {
    startBattle();
    const kana = currentKana();
    const input = screen.getByRole("textbox");

    // Antes, "xq" já virava erro na hora. Agora fica no campo até a pessoa confirmar.
    fireEvent.change(input, { target: { value: "xq" } });
    expect(input).toHaveValue("xq");
    expect(attemptsSoFar()).toBe("0/10");

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter" }); // Enter com o campo vazio: nada acontece
    expect(attemptsSoFar()).toBe("0/10");

    fireEvent.change(input, { target: { value: kana.romaji } });
    expect(screen.getByText(kana.char)).toBeInTheDocument();
    expect(attemptsSoFar()).toBe("0/10");

    fireEvent.keyDown(input, { key: "Enter" });
    expect(attemptsSoFar()).toBe("1/10");
    expect(input).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: /Encerrar sessão/ }));
    expect(loadLocalDojoSessions()[0].attempts.map((attempt) => attempt.outcome)).toEqual(["correct"]);
  });

  it("celular: o Espaço não confirma (e não entra no campo); o Enter do teclado chega pelo envio do formulário", () => {
    stubPointer(false);
    startBattle();
    const kana = currentKana();
    const input = screen.getByRole("textbox");

    expect(screen.getByText("Enter confirma")).toBeInTheDocument();
    expect(screen.queryByText(/Esc encerra/)).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: kana.romaji } });
    fireEvent.keyDown(input, { key: " " });
    fireEvent.change(input, { target: { value: `${kana.romaji} ` } });
    expect(input).toHaveValue(kana.romaji);
    expect(attemptsSoFar()).toBe("0/10");

    const form = input.closest("form");
    if (!form) throw new Error("o campo deveria estar num formulário");
    fireEvent.submit(form);
    expect(attemptsSoFar()).toBe("1/10");
  });

  it("computador: Enter ou Espaço confirmam; segurar a tecla não confirma o kana seguinte", () => {
    stubPointer(true);
    startBattle();
    const input = screen.getByRole("textbox");
    expect(screen.getByText("Enter ou Espaço confirma · Esc encerra")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: currentKana().romaji } });
    fireEvent.keyDown(input, { key: " ", code: "Space" });
    expect(attemptsSoFar()).toBe("1/10");

    advance(50);
    fireEvent.change(input, { target: { value: currentKana().romaji } });
    fireEvent.keyDown(input, { key: " ", code: "Space", repeat: true });
    expect(attemptsSoFar()).toBe("1/10");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(attemptsSoFar()).toBe("2/10");

    // No teclado japonês (IME), Enter e Espaço escolhem a conversão: não confirmam.
    advance(50);
    fireEvent.change(input, { target: { value: currentKana().romaji } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    fireEvent.keyDown(input, { key: " ", keyCode: 229 });
    expect(attemptsSoFar()).toBe("2/10");
  });

  it("na batalha a arena encolhe no celular (ninjas numa faixa baixa) e o placar fica para telas maiores", () => {
    startBattle();
    const header = screen.getByRole("banner");
    expect(header.querySelector("canvas")).not.toBeNull(); // os ninjas continuam lá
    expect(header.firstElementChild?.nextElementSibling?.nextElementSibling).toHaveClass("pb-[4.5rem]", "sm:pb-32");
    expect(screen.getByRole("group", { name: "Resumo de desempenho" }).parentElement).toHaveClass("hidden", "sm:flex");
  });

  it("Espaço no lobby continua iniciando a batalha", () => {
    renderArena();
    fireEvent.click(screen.getByRole("button", { name: /Entrar na arena/ }));

    fireEvent.keyDown(document.body, { code: "Space", key: " " });
    expect(screen.getByText("Prepare-se para a batalha")).toBeInTheDocument();
  });

  it("modo foco: no treino somem o cabeçalho e o menu, fica só o áudio", () => {
    renderArena();
    fireEvent.click(screen.getByRole("button", { name: /Entrar na arena/ }));
    fireEvent.click(screen.getByRole("switch", { name: /Modo foco/ }));
    fireEvent.click(screen.getByRole("button", { name: /Iniciar batalha/ }));
    runCountdown();

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Alternar área de estudo" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ativar áudio" })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("com áudio ligado mantém as pausas de entrada e de início de batalha", () => {
    localStorage.setItem(AUDIO_KEY, "on");
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    renderArena();

    fireEvent.click(screen.getByRole("button", { name: /Entrar na arena/ }));
    expect(screen.getByRole("button", { name: /Entrando/ })).toBeDisabled();
    advance(ENTER_ARENA_DELAY_MS - 50);
    expect(screen.queryByText("Sala de preparação")).not.toBeInTheDocument();
    advance(50);
    expect(screen.getByText("Sala de preparação")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Iniciar batalha/ }));
    expect(screen.getByRole("button", { name: /Preparando/ })).toBeDisabled();
    advance(BATTLE_START_DELAY_MS);
    expect(screen.getByText("Prepare-se para a batalha")).toBeInTheDocument();
  });
});
