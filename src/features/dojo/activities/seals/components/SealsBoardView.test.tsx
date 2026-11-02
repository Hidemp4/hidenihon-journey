import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { boardOf, flip, pairPositions, startSeals } from "../testUtils";
import { SealsBoardView } from "./SealsBoardView";

function renderBoard(reduceMotion: boolean, finished = false) {
  const start = startSeals({ sizeId: "3x4" });
  const [[a, b]] = pairPositions(boardOf(start));
  const board = boardOf(flip(flip(start, a), b));
  const onFlip = vi.fn();
  const onAbandon = vi.fn();
  render(<SealsBoardView board={board} finished={finished} reduceMotion={reduceMotion} onFlip={onFlip} onAbandon={onAbandon} />);
  return { a, b, onFlip, onAbandon };
}

describe("mesa dos Selos", () => {
  afterEach(cleanup);

  it("grade com linhas e células; cada carta é um botão com rótulo", () => {
    const { a, b } = renderBoard(false);
    const grid = screen.getByRole("grid", { name: "Mesa de selos: 12 cartas, 3 por linha" });
    expect(within(grid).getAllByRole("row")).toHaveLength(4);
    expect(within(grid).getAllByRole("gridcell")).toHaveLength(12);

    const buttons = within(grid).getAllByRole("button");
    expect(buttons[a]).toHaveAccessibleName(new RegExp(`^Carta ${a + 1} de 12, selo carimbado: `));
    expect(buttons[a]).toHaveAttribute("aria-disabled", "true");
    expect(buttons[b]).toHaveAttribute("aria-disabled", "true");
    expect(buttons.filter((button) => !button.hasAttribute("aria-disabled"))).toHaveLength(10);
    expect(grid).toHaveAccessibleDescription("Setas andam pela mesa · Enter ou Espaço vira");
  });

  it("Enter e Espaço viram a carta focada; tecla repetida não vira de novo", () => {
    const { onFlip } = renderBoard(false);
    const [first, second] = within(screen.getByRole("grid")).getAllByRole("button");
    fireEvent.keyDown(first, { key: "Enter" });
    fireEvent.keyDown(second, { key: " " });
    fireEvent.keyDown(second, { key: " ", repeat: true });
    expect(onFlip.mock.calls).toEqual([[0], [1]]);
  });

  it("com movimento: as cartas giram em 3D", () => {
    renderBoard(false);
    expect(document.querySelectorAll('[class*="rotateY(180deg)"]').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('[class*="preserve-3d"]')).toHaveLength(12);
  });

  it("movimento reduzido: nada gira, as faces só trocam de opacidade, e o carimbo já está no lugar", () => {
    const { a } = renderBoard(true);
    expect(document.querySelectorAll('[class*="rotateY"]')).toHaveLength(0);
    expect(document.querySelectorAll('[class*="preserve-3d"]')).toHaveLength(0);

    const card = within(screen.getByRole("grid")).getAllByRole("button")[a];
    const stamp = within(card).getAllByText("印").find((element) => element.className.includes("border-journey-orange"));
    expect(stamp).toBeDefined();
    expect(stamp?.style.opacity === "" || stamp?.style.opacity === "1").toBe(true);
  });

  it("anúncio do par sempre montado; mesa completa esconde 'Encerrar'", () => {
    const { onAbandon } = renderBoard(false);
    expect(screen.getByRole("status")).toHaveTextContent(/Par formado: .+ e .+! 1 de 6 pares\./);
    fireEvent.click(screen.getByRole("button", { name: "Encerrar partida" }));
    expect(onAbandon).toHaveBeenCalledTimes(1);

    cleanup();
    renderBoard(false, true);
    expect(screen.queryByRole("button", { name: "Encerrar partida" })).not.toBeInTheDocument();
    expect(screen.getByText("Mesa completa")).toBeInTheDocument();
  });
});
