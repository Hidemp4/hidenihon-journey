import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { loadMastery } from "@/features/dojo/shared/mastery";
import { getKanaStudyItems } from "@/features/dojo/shared/studyItem";
import { createMemoryStorage } from "@/features/dojo/shared/test/memoryStorage";
import { TestRouter } from "@/features/dojo/shared/test/router";
import BrushPage from "./BrushPage";
import { strokeTimeline, timelineEnd } from "./drawing";
import { loadKanaStrokes, loadStrokeSet, type GlyphModel, type StrokeSet } from "./strokeData";
import type { Point } from "./strokePath";

/** O jsdom 20 não tem PointerEvent: um MouseEvent com `pointerId`/`pointerType` basta para o React. */
class TestPointerEvent extends MouseEvent {
  pointerId: number;
  pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? "touch";
  }
}

let strokes: StrokeSet;
let kanjiStrokes: StrokeSet;
const originalPointerEvent = window.PointerEvent;

beforeAll(async () => {
  Object.defineProperty(window, "PointerEvent", { configurable: true, writable: true, value: TestPointerEvent });
  strokes = await loadKanaStrokes();
  kanjiStrokes = await loadStrokeSet("kanji");
});

afterAll(() => {
  Object.defineProperty(window, "PointerEvent", { configurable: true, writable: true, value: originalPointerEvent });
});

function renderBrush() {
  render(
    <TestRouter path="/dojo/pincel">
      <Routes>
        <Route path="/dojo" element={<p>Hub do Dojô</p>} />
        <Route path="/dojo/pincel" element={<BrushPage />} />
      </Routes>
    </TestRouter>
  );
}

/** Os traços já estão em cache: só falta o React receber a promessa resolvida (alguns ticks de microtarefa). */
async function flushStrokes() {
  await act(async () => {
    for (let tick = 0; tick < 5; tick += 1) await Promise.resolve();
  });
}

const location = () => screen.getByTestId("location").textContent;
const status = () => screen.getByRole("status");
const board = () => screen.getByRole("img", { name: /^Quadro de escrita/ });
const hud = () => screen.getByRole("group", { name: "Placar do pincel" });

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

/** Kana em tela, lido do enunciado: "Escreva あ, a." (Traçar/Estudar) ou "Escreva a em hiragana." (De memória). */
function currentGlyph(): GlyphModel {
  const name = screen.getByRole("heading", { level: 2, name: /^Escreva/ }).textContent ?? "";
  const byRomaji = /^Escreva (\S+) em (hiragana|katakana)/.exec(name);
  const char = byRomaji ? getKanaStudyItems(byRomaji[2] === "hiragana" ? "hiragana" : "katakana").find((item) => item.romaji === byRomaji[1])?.char : /^Escreva (\S+),/.exec(name)?.[1];
  const glyph = char ? (strokes.glyphs.get(char) ?? kanjiStrokes.glyphs.get(char)) : undefined;
  if (!glyph) throw new Error(`kana não encontrado em: ${name}`);
  return glyph;
}

/** Um traço com o dedo: desce, arrasta pelos pontos e levanta. O canvas tem 109px, então px = unidade. */
function drawStroke(points: readonly Point[]) {
  const canvas = board();
  const sampled = points.filter((_, index) => index % 4 === 0 || index === points.length - 1);
  fireEvent.pointerDown(canvas, { pointerId: 7, pointerType: "touch", clientX: sampled[0].x, clientY: sampled[0].y });
  for (const point of sampled.slice(1)) fireEvent.pointerMove(canvas, { pointerId: 7, pointerType: "touch", clientX: point.x, clientY: point.y });
  const last = sampled[sampled.length - 1];
  fireEvent.pointerUp(canvas, { pointerId: 7, pointerType: "touch", clientX: last.x, clientY: last.y });
}

function drawGlyph(glyph: GlyphModel, transform: (point: Point) => Point = (point) => point) {
  for (const stroke of glyph.strokes) drawStroke(stroke.points.map(transform));
}

function startWith(mode: RegExp) {
  fireEvent.click(screen.getByRole("button", { name: mode }));
  fireEvent.click(screen.getByRole("button", { name: "あ行" }));
  fireEvent.click(screen.getByRole("button", { name: /Começar sessão/ }));
}

// Cada passo do relógio re-renderiza a página (com a arena do cabeçalho): sob carga o fluxo passa
// dos 5s padrão sem nada de errado, então o limite é maior (como nos fluxos da arena e dos Selos).
describe("Pincel (fluxo completo)", { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "performance", "Date"],
    });
    vi.stubGlobal("localStorage", createMemoryStorage());
    localStorage.setItem("hidenihon:kana-reaction:audio", "off");
    vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 109,
      height: 109,
      right: 109,
      bottom: 109,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("Traçar: animação, traço invertido recusado, traços certos, nota, resumo e praticados", async () => {
    renderBrush();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Pincel 筆");
    expect(screen.getByRole("link", { name: "KanjiVG" })).toHaveAttribute("href", "https://kanjivg.tagaini.net");
    expect(screen.getByRole("link", { name: "CC BY-SA 3.0" })).toBeInTheDocument();
    await flushStrokes();
    expect(screen.getByText("46 kana no baralho · 0 já praticados")).toBeInTheDocument();

    startWith(/^Traçar/);
    expect(screen.getByRole("heading", { level: 2, name: /^Escreva/ })).toHaveFocus();
    expect(board()).toHaveClass("touch-none");

    // Abre com a animação da ordem; depois fica o guia com o próximo traço.
    const first = currentGlyph();
    expect(screen.getByRole("button", { name: /Ver ordem/ })).toBeInTheDocument();
    advance(timelineEnd(strokeTimeline(first.strokes.map((stroke) => stroke.length))) + 450);
    expect(screen.getByText(new RegExp(`^Traço 1 de ${first.strokes.length}: siga o laranja`))).toBeInTheDocument();

    // 1º traço ao contrário: recusado, com o motivo anunciado.
    drawStroke([...first.strokes[0].points].reverse());
    expect(status()).toHaveTextContent(`${first.char}: traço 1 de ${first.strokes.length} na direção contrária. Comece do outro lado.`);
    expect(board()).toHaveAccessibleName(`Quadro de escrita: 0 de ${first.strokes.length} traços feitos`);

    drawGlyph(first);
    expect(status()).toHaveTextContent("Kana completo!");
    expect(screen.getByText(/^Nota (9\d|100) · 1 correção$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próximo (Enter)" })).toHaveFocus();
    press("Enter");

    for (let card = 2; card <= 5; card += 1) {
      expect(screen.getByText(`Kana ${card} de 5`)).toBeInTheDocument();
      drawGlyph(currentGlyph());
      press("Enter");
    }

    expect(screen.getByRole("heading", { name: "Sessão de escrita concluída" })).toHaveFocus();
    expect(screen.getByText("4/5")).toBeInTheDocument();
    const records = Object.entries(loadMastery().items);
    expect(records).toHaveLength(5);
    expect(records.find(([id]) => id === `hiragana:${first.char}`)?.[1]).toMatchObject({ seen: 1, correct: 0 });

    fireEvent.click(screen.getByRole("button", { name: "Concluir" }));
    expect(screen.getByText("5 kana no baralho · 5 já praticados")).toBeInTheDocument();
    expect(hud()).toHaveTextContent("Praticados5");
  });

  it("De memória: desenho encaixado, autoavaliação pelo teclado e o caminho só de teclado", async () => {
    renderBrush();
    await flushStrokes();
    startWith(/^De memória/);

    // Só o romaji: o kana não aparece antes de conferir.
    const heading = screen.getByRole("heading", { level: 2, name: /^Escreva/ });
    expect(heading.querySelector('[lang="ja"]')).toBeNull();
    const glyph = currentGlyph();

    // Desenho certo, mas pequeno e no canto: a nota encaixa antes de comparar.
    drawGlyph(glyph, (point) => ({ x: point.x * 0.6, y: point.y * 0.6 }));
    expect(board()).toHaveAccessibleName(`Quadro de escrita: ${glyph.strokes.length} traços desenhados`);
    press("Enter");
    expect(status()).toHaveTextContent(new RegExp(`^Modelo à mostra: ${glyph.char}\\. Nota automática (9\\d|100) de 100`));
    expect(screen.getByRole("button", { name: /^Acertei/ })).toHaveFocus();
    press("3");

    // Sem desenhar: conferir mostra o modelo e a pessoa se avalia (quem só tem teclado consegue treinar).
    expect(screen.getByText("Kana 2 de 5")).toBeInTheDocument();
    press("Enter");
    expect(status()).toHaveTextContent(/Nota automática 0 de 100, 0 de \d traços/);
    expect(screen.getByRole("button", { name: /^Errei/ })).toHaveFocus();
    press("1");

    press("Escape");
    expect(location()).toBe("/dojo/pincel");
    expect(screen.getByText("1/2")).toBeInTheDocument();
    const outcomes = Object.values(loadMastery().items).map((record) => record.correct);
    expect(outcomes.sort()).toEqual([0, 1]);
  });

  it("Estudar ordem: setas avançam e voltam, nada vai para o domínio; Esc no resumo volta ao Dojô", async () => {
    renderBrush();
    await flushStrokes();
    startWith(/^Estudar ordem/);

    expect(screen.queryByRole("img", { name: /^Quadro de escrita/ })).not.toBeInTheDocument();
    expect(status()).toHaveTextContent(/^Kana 1 de 5: あ, a, 3 traços\.$/);
    press("ArrowRight");
    expect(status()).toHaveTextContent(/^Kana 2 de 5: い, i, 2 traços\.$/);
    press("ArrowLeft");
    expect(status()).toHaveTextContent(/^Kana 1 de 5: あ/);
    press("ArrowRight");
    press("ArrowRight");

    press("Escape");
    expect(screen.getByRole("heading", { name: "Estudo da ordem concluído" })).toBeInTheDocument();
    expect(screen.getByText(/Você viu a ordem dos traços de 2 kana/)).toBeInTheDocument();
    expect(loadMastery().items).toEqual({});

    press("Escape");
    expect(location()).toBe("/dojo");
  });

  it("sair pelo '← Dojô' no meio grava o que já foi avaliado", async () => {
    renderBrush();
    await flushStrokes();
    startWith(/^Traçar/);
    drawGlyph(currentGlyph());
    press("Enter");
    drawStroke(currentGlyph().strokes[0].points);

    fireEvent.click(screen.getByRole("link", { name: "Voltar ao Dojô" }));
    expect(location()).toBe("/dojo");
    expect(Object.keys(loadMastery().items)).toHaveLength(1);
    expect(Object.keys(JSON.parse(localStorage.getItem("hidenihon:dojo:brush:v1") ?? "{}").practiced)).toHaveLength(1);
  });

  it("Kanji N5: traços do KanjiVG carregados sob demanda, traçar 5 kanji e gravar como kanji:", async () => {
    renderBrush();
    await flushStrokes();
    fireEvent.click(screen.getByRole("button", { name: /Kanji N5/ }));
    await flushStrokes();
    fireEvent.click(screen.getByRole("button", { name: "Corpo" }));
    expect(screen.getByText("5 kanji no baralho · 0 já praticados")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Traçar/ }));
    fireEvent.click(screen.getByRole("button", { name: /Começar sessão/ }));

    for (let card = 1; card <= 5; card += 1) {
      expect(screen.getByText(`Kanji ${card} de 5`)).toBeInTheDocument();
      const glyph = currentGlyph();
      expect(screen.getByRole("heading", { level: 2, name: new RegExp(`^Escreva ${glyph.char}, `) })).toBeInTheDocument();
      drawGlyph(glyph);
      const total = glyph.strokes.length;
      expect(status()).toHaveTextContent(`${glyph.char}: traço ${total} de ${total} certo. Kanji completo!`);
      press("Enter");
    }

    // "5/5" também aparece no placar do topo (Kanji 5/5): confere dentro do resumo.
    const summary = screen.getByRole("heading", { name: "Sessão de escrita concluída" }).closest("section");
    if (!summary) throw new Error("resumo sem painel");
    expect(within(summary).getByText("5/5")).toBeInTheDocument();
    expect(Object.keys(loadMastery().items).sort()).toEqual(["kanji:口", "kanji:手", "kanji:目", "kanji:耳", "kanji:足"].sort());
    fireEvent.click(screen.getByRole("button", { name: "Concluir" }));
    expect(screen.getByText("5 kanji no baralho · 5 já praticados")).toBeInTheDocument();
  });
});
