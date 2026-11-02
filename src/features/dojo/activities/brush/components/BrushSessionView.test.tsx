import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BOTTOM, TOP, draw, run, sessionOf, startBrush } from "../testUtils";
import type { BrushMode, BrushSession } from "../types";
import { BrushSessionView } from "./BrushSessionView";

function renderSession(session: BrushSession, reduceMotion: boolean) {
  const card = session.cards[session.index];
  render(
    <BrushSessionView
      session={session}
      card={card}
      reduceMotion={reduceMotion}
      onStroke={vi.fn()}
      onUndo={vi.fn()}
      onClear={vi.fn()}
      onCheck={vi.fn()}
      onGrade={vi.fn()}
      onNext={vi.fn()}
      onPrev={vi.fn()}
      onSkip={vi.fn()}
      onFinish={vi.fn()}
    />
  );
}

const fresh = (mode: BrushMode) => sessionOf(startBrush(mode));
// Só as camadas do quadro (viewBox do KanjiVG): os ícones dos botões também são SVG com <path>.
const BOARD_LAYER = 'svg[viewBox="0 0 109 109"]';
const boardPaths = () => document.querySelectorAll(`${BOARD_LAYER} path`);
const numbersShown = () => [...document.querySelectorAll(`${BOARD_LAYER} text`)].map((text) => text.textContent);

describe("Pincel: movimento reduzido", () => {
  afterEach(cleanup);

  it("Traçar com movimento: abre animando a ordem e oferece 'Ver ordem'", () => {
    renderSession(fresh("trace"), false);
    expect(screen.getByRole("button", { name: /Ver ordem/ })).toBeInTheDocument();
    // Guia (2 traços) + animação (2 traços) por cima.
    expect(boardPaths()).toHaveLength(4);
  });

  it("Traçar sem movimento: nada anima, o guia já mostra os traços numerados", () => {
    renderSession(fresh("trace"), true);
    expect(screen.queryByRole("button", { name: /Ver ordem/ })).not.toBeInTheDocument();
    expect(boardPaths()).toHaveLength(2);
    expect(numbersShown()).toEqual(["1", "2"]);
    expect(screen.getByText("Traço 1 de 2: siga o laranja, a partir do ponto.")).toBeInTheDocument();
  });

  it("Estudar ordem sem movimento: traços numerados parados, sem 'Repetir'", () => {
    renderSession(fresh("study"), true);
    expect(screen.queryByRole("button", { name: /Repetir/ })).not.toBeInTheDocument();
    expect(numbersShown()).toEqual(["1", "2"]);
    expect(screen.getByRole("button", { name: /Anterior/ })).toBeDisabled();
  });
});

describe("Pincel: telas do kana", () => {
  afterEach(cleanup);

  it("o quadro é uma imagem com rótulo, sem rolar a página no toque", () => {
    renderSession(sessionOf(draw(startBrush("trace"), TOP)), true);
    const board = screen.getByRole("img", { name: "Quadro de escrita: 1 de 2 traços feitos" });
    expect(board).toHaveClass("touch-none");
    expect(board).toHaveAccessibleDescription(/Desenhe com o dedo, a caneta ou o mouse/);
  });

  it("De memória conferido: modelo revelado e autoavaliação com a sugestão em destaque", () => {
    const state = run(draw(startBrush("recall"), TOP, BOTTOM), { type: "CHECK", cardKey: "s1:0" });
    renderSession(sessionOf(state), true);

    expect(numbersShown()).toEqual(["1", "2"]);
    const group = screen.getByRole("group", { name: "Como foi?" });
    expect(within(group).getAllByRole("button").map((button) => button.textContent)).toEqual(["Errei1", "Quase2", "Acertei3"]);
    expect(within(group).getByRole("button", { name: /Acertei/ })).toHaveFocus();
    expect(within(group).getByRole("button", { name: /Acertei/ })).toHaveAccessibleDescription("Sugestão pela nota: Acertei");
    expect(screen.getByText(/^Nota automática 100 de 100 · 2 de 2 traços$/)).toBeInTheDocument();
  });
});
