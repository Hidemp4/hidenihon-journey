import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getKanjiStudyItems } from "@/features/dojo/shared/kanjiDeck";
import { loadMastery } from "@/features/dojo/shared/mastery";
import { getKanaStudyItems } from "@/features/dojo/shared/studyItem";
import { openAdvancedSettings } from "@/features/dojo/shared/test/advancedSettings";
import { createMemoryStorage } from "@/features/dojo/shared/test/memoryStorage";
import { TestRouter } from "@/features/dojo/shared/test/router";
import { MISMATCH_HIDE_MS } from "./constants";
import SealsPage from "./SealsPage";

const KANA = [...getKanaStudyItems("hiragana"), ...getKanaStudyItems("katakana")];
const KANJI = getKanjiStudyItems();
type PairType = "kana-romaji" | "hiragana-katakana" | "kanji-meaning";

/** Parceiro de uma face: kana ↔ romaji, hiragana ↔ katakana (pelo som) ou kanji ↔ significado. */
function partnerOf(text: string, pairType: PairType) {
  if (pairType === "kanji-meaning") {
    const byChar = KANJI.find((item) => item.char === text);
    return byChar ? byChar.meaning : KANJI.find((item) => item.meaning === text)?.char;
  }
  if (pairType === "kana-romaji") {
    const byChar = KANA.find((item) => item.script === "hiragana" && item.char === text);
    return byChar ? byChar.romaji : KANA.find((item) => item.script === "hiragana" && item.romaji === text)?.char;
  }
  const item = KANA.find((candidate) => candidate.char === text);
  return KANA.find((candidate) => candidate.romaji === item?.romaji && candidate.script !== item?.script)?.char;
}

function renderSeals() {
  render(
    <TestRouter path="/dojo/selos">
      <Routes>
        <Route path="/dojo" element={<p>Hub do Dojô</p>} />
        <Route path="/dojo/selos" element={<SealsPage />} />
      </Routes>
    </TestRouter>
  );
}

const location = () => screen.getByTestId("location").textContent;
const cards = () => within(screen.getByRole("grid", { name: /^Mesa de selos/ })).getAllByRole("button");
const hud = () => screen.getByRole("group", { name: "Placar dos selos" });

/** Passos pequenos, cada um no seu `act`. */
function advance(ms: number, step = 50) {
  for (let elapsed = 0; elapsed < ms; elapsed += step) {
    act(() => {
      vi.advanceTimersByTime(Math.min(step, ms - elapsed));
    });
  }
}

function faceOf(index: number) {
  const label = cards()[index].getAttribute("aria-label") ?? "";
  const match = /, (?:virada|selo carimbado): (.+)$/u.exec(label);
  if (!match) throw new Error(`carta ${index + 1} não está à mostra: ${label}`);
  return match[1];
}

/** Vira pelo teclado, alternando Enter e Espaço, e devolve a face lida no rótulo. */
let useSpace = false;
function flipByKeyboard(index: number) {
  const card = cards()[index];
  // O foco muda a carta ativa (estado do componente): fora do `act`, o React reclama.
  act(() => card.focus());
  useSpace = !useSpace;
  fireEvent.keyDown(card, { key: useSpace ? " " : "Enter" });
  return faceOf(index);
}

/**
 * Jogador de memória perfeita: só vira carta nova quando não conhece um par pronto.
 * Para depois de `untilMatches` pares (ou no fim da mesa) e devolve quantas jogadas fez.
 */
function playPerfectly(pairType: PairType, untilMatches = Infinity) {
  const total = cards().length;
  const known = new Map<string, number>();
  const seen = new Set<number>();
  let moves = 0;
  let matches = 0;
  const nextUnseen = () => {
    for (let index = 0; index < total; index += 1) if (!seen.has(index)) return index;
    throw new Error("acabaram as cartas novas");
  };
  const flipNew = () => {
    const index = nextUnseen();
    seen.add(index);
    return { index, text: flipByKeyboard(index) };
  };

  while (matches < untilMatches && matches < total / 2) {
    advance(200); // um tempinho entre as jogadas, para o cronômetro andar

    const ready = [...known].find(([text]) => known.has(partnerOf(text, pairType) ?? ""));
    if (ready) {
      const [text, index] = ready;
      const partner = partnerOf(text, pairType) ?? "";
      flipByKeyboard(index);
      flipByKeyboard(known.get(partner) ?? -1);
      known.delete(text);
      known.delete(partner);
      moves += 1;
      matches += 1;
      continue;
    }

    const first = flipNew();
    const partner = partnerOf(first.text, pairType) ?? "";
    if (known.has(partner)) {
      flipByKeyboard(known.get(partner) ?? -1);
      known.delete(partner);
      moves += 1;
      matches += 1;
      continue;
    }

    const second = flipNew();
    moves += 1;
    if (second.text === partner) {
      matches += 1;
      continue;
    }

    known.set(first.text, first.index);
    known.set(second.text, second.index);
    expect(screen.getByRole("status")).toHaveTextContent(`Não combinou com ${first.text}.`);

    // 3º clique durante a resolução: bloqueado (nem vira, nem conta jogada).
    const blocked = [...Array(total).keys()].find((index) => !seen.has(index));
    if (blocked != null) {
      fireEvent.click(cards()[blocked]);
      expect(cards()[blocked]).toHaveAccessibleName(`Carta ${blocked + 1} de ${total}, virada para baixo`);
    }
    expect(hud()).toHaveTextContent(`Jogadas${moves}`);

    advance(MISMATCH_HIDE_MS + 50);
    expect(cards()[first.index]).toHaveAccessibleName(`Carta ${first.index + 1} de ${total}, virada para baixo`);
    expect(cards()[second.index]).toHaveAccessibleName(`Carta ${second.index + 1} de ${total}, virada para baixo`);
  }

  return moves;
}

// Cada passo do relógio re-renderiza a página inteira (com a arena do cabeçalho): sob carga da máquina
// o fluxo passa dos 5s padrão sem nada de errado, então o limite é maior (como no teste antigo da arena).
describe("Selos (fluxo completo)", { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "performance", "Date"],
    });
    vi.stubGlobal("localStorage", createMemoryStorage());
    localStorage.setItem("hidenihon:kana-reaction:audio", "off");
    useSpace = false;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("3×4 no teclado: setas, viradas, erro que desvira, vitória, recorde salvo", () => {
    renderSeals();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Selos 印");
    expect(screen.getByText("Kana ↔ romaji · Hiragana · 3×4 (6 pares)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Começar partida/ }));
    expect(cards()).toHaveLength(12);
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(cards()[0]).toHaveFocus();
    expect(cards()[0]).toHaveAccessibleName("Carta 1 de 12, virada para baixo");
    expect(cards().filter((card) => card.tabIndex === 0)).toEqual([cards()[0]]);

    // Setas andam pela grade (3 colunas): → 2, ↓ 5, Home 4, Ctrl+End 12.
    fireEvent.keyDown(cards()[0], { key: "ArrowRight" });
    expect(cards()[1]).toHaveFocus();
    fireEvent.keyDown(cards()[1], { key: "ArrowDown" });
    expect(cards()[4]).toHaveFocus();
    fireEvent.keyDown(cards()[4], { key: "Home" });
    expect(cards()[3]).toHaveFocus();
    fireEvent.keyDown(cards()[3], { key: "End", ctrlKey: true });
    expect(cards()[11]).toHaveFocus();
    expect(cards()[11].tabIndex).toBe(0);
    expect(cards()[0].tabIndex).toBe(-1);

    // Cronômetro só começa na 1ª virada.
    advance(1_200);
    expect(hud()).toHaveTextContent("Tempo0:00");

    const moves = playPerfectly("kana-romaji");

    const heading = screen.getByRole("heading", { name: "Todos os pares carimbados!" });
    expect(heading).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(`Todos os selos carimbados em ${moves} jogadas`);
    expect(screen.getByText("Primeiro recorde neste tabuleiro!")).toBeInTheDocument();
    expect(cards().every((card) => /selo carimbado/.test(card.getAttribute("aria-label") ?? ""))).toBe(true);
    expect(hud()).toHaveTextContent(`Jogadas${moves}`);
    expect(hud()).not.toHaveTextContent("Tempo0:00");

    // Memória perfeita nunca tropeça: os 6 kana entram como acerto.
    const records = Object.values(loadMastery().items);
    expect(records).toHaveLength(6);
    expect(records.every((record) => record.correct === 1 && record.seen === 1)).toBe(true);

    // O tempo para no último par.
    const finalTime = hud().textContent;
    advance(1_200);
    expect(hud().textContent).toBe(finalTime);

    fireEvent.click(screen.getByRole("button", { name: "Concluir" }));
    expect(screen.getByText(new RegExp(`Recorde neste tabuleiro: ${moves} jogadas`))).toBeInTheDocument();
    expect(hud()).toHaveTextContent(`Recorde${moves}`);
    expect(JSON.parse(localStorage.getItem("hidenihon:dojo:seals:v1") ?? "{}").best["kana-romaji:hiragana:3x4"].moves).toBe(moves);
  });

  it("Jogar de novo monta outra mesa e volta o foco para a 1ª carta", () => {
    renderSeals();
    fireEvent.click(screen.getByRole("button", { name: /Começar partida/ }));
    playPerfectly("kana-romaji");

    fireEvent.click(screen.getByRole("button", { name: /Jogar de novo/ }));
    expect(screen.queryByRole("heading", { name: "Todos os pares carimbados!" })).not.toBeInTheDocument();
    expect(cards()[0]).toHaveFocus();
    expect(cards().every((card) => /virada para baixo/.test(card.getAttribute("aria-label") ?? ""))).toBe(true);
    expect(hud()).toHaveTextContent("Jogadas0");
  });

  it("Esc encerra a partida (lobby dos Selos, progresso no domínio) e, no lobby, volta ao Dojô", () => {
    renderSeals();
    fireEvent.click(screen.getByRole("button", { name: /Começar partida/ }));
    playPerfectly("kana-romaji", 1);

    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(location()).toBe("/dojo/selos");
    expect(screen.getByRole("heading", { name: "Pronto para carimbar?" })).toBeInTheDocument();
    expect(Object.keys(loadMastery().items)).toHaveLength(1);
    expect(localStorage.getItem("hidenihon:dojo:seals:v1") ?? "").not.toContain('"moves"');

    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(location()).toBe("/dojo");
  });

  it("hiragana ↔ katakana: sair pelo '← Dojô' no meio grava os dois kana do par", () => {
    renderSeals();
    fireEvent.click(screen.getByRole("button", { name: /Hiragana ↔ katakana/ }));
    expect(screen.queryByRole("group", { name: "Alfabeto" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /4×4/ }));
    expect(screen.getByText("Hiragana ↔ katakana · 4×4 (8 pares)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Começar partida/ }));
    expect(cards()).toHaveLength(16);

    playPerfectly("hiragana-katakana", 1);
    fireEvent.click(screen.getByRole("link", { name: "Voltar ao Dojô" }));

    expect(location()).toBe("/dojo");
    const ids = Object.keys(loadMastery().items);
    expect(ids).toHaveLength(2);
    expect(ids.some((id) => id.startsWith("hiragana:"))).toBe(true);
    expect(ids.some((id) => id.startsWith("katakana:"))).toBe(true);
  });

  it("conteúdo pequeno para o tabuleiro: explica e não deixa começar", () => {
    renderSeals();
    fireEvent.click(screen.getByRole("button", { name: /4×6/ }));
    openAdvancedSettings();
    fireEvent.click(screen.getByRole("button", { name: /^や/ }));
    expect(screen.getByText(/Este tabuleiro pede 12 pares e o conteúdo escolhido tem 3/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Começar partida/ })).toBeDisabled();
  });

  it("kanji ↔ significado: mesa de kanji, vitória e domínio com ids kanji:", () => {
    renderSeals();
    fireEvent.click(screen.getByRole("button", { name: /Kanji ↔ significado/ }));
    openAdvancedSettings();
    expect(screen.getByRole("heading", { name: "Temas de kanji" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Corpo" }));
    // 5 kanji não enchem a mesa de 6 pares.
    expect(screen.getByRole("button", { name: /Começar partida/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Números e dinheiro" }));
    expect(screen.getByText("Kanji ↔ significado · 3×4 (6 pares)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Começar partida/ }));

    playPerfectly("kanji-meaning");
    expect(screen.getByRole("heading", { name: "Todos os pares carimbados!" })).toHaveFocus();
    const ids = Object.keys(loadMastery().items);
    expect(ids).toHaveLength(6);
    expect(ids.every((id) => id.startsWith("kanji:"))).toBe(true);
    expect(JSON.parse(localStorage.getItem("hidenihon:dojo:seals:v1") ?? "{}").best["kanji-meaning:kanji:3x4"]).toBeDefined();
  });
});
