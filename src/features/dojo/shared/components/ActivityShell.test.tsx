import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { TestRouter } from "../test/router";
import { ActivityShell } from "./ActivityShell";

type ShellProps = Omit<ComponentProps<typeof ActivityShell>, "children" | "activity" | "audioEnabled" | "onToggleAudio">;

function renderShell(props: ShellProps = {}) {
  const onToggleAudio = vi.fn();
  render(
    <TestRouter path="/dojo/teste">
      <Routes>
        <Route path="/dojo" element={<p>Hub do Dojô</p>} />
        <Route
          path="/dojo/teste"
          element={
            <ActivityShell activity={{ name: "Pergaminhos", kanji: "巻物" }} audioEnabled onToggleAudio={onToggleAudio} {...props}>
              <main>
                <input aria-label="Resposta" />
              </main>
            </ActivityShell>
          }
        />
      </Routes>
    </TestRouter>
  );
  return { onToggleAudio };
}

const location = () => screen.getByTestId("location").textContent;

describe("ActivityShell", () => {
  it("mostra o título da atividade como h1, o link de volta, o status e o áudio", () => {
    const { onToggleAudio } = renderShell({ eyebrow: "Revisão" });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Pergaminhos 巻物");
    expect(screen.getByRole("navigation", { name: "Alternar área de estudo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao Dojô" })).toHaveAttribute("href", "/dojo");
    expect(screen.getByText("Revisão")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Desativar áudio" }));
    expect(onToggleAudio).toHaveBeenCalledTimes(1);
  });

  it("Esc volta ao hub, inclusive com o foco num campo", () => {
    renderShell();
    screen.getByRole("textbox", { name: "Resposta" }).focus();

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Resposta" }), { key: "Escape" });
    expect(location()).toBe("/dojo");
    expect(screen.getByText("Hub do Dojô")).toBeInTheDocument();
  });

  it("Esc não sai durante uma resposta em andamento", () => {
    renderShell({ escapeToHub: false });

    fireEvent.keyDown(window, { key: "Escape" });
    expect(location()).toBe("/dojo/teste");
  });

  it("Esc já usado pela atividade (preventDefault) não navega", () => {
    const consume = (event: KeyboardEvent) => event.preventDefault();
    window.addEventListener("keydown", consume);

    try {
      renderShell();
      fireEvent.keyDown(window, { key: "Escape" });
      expect(location()).toBe("/dojo/teste");
    } finally {
      window.removeEventListener("keydown", consume);
    }
  });

  it("Esc que cancela a conversão do IME não navega", () => {
    renderShell();

    fireEvent.keyDown(window, { key: "Escape", isComposing: true });
    expect(location()).toBe("/dojo/teste");
    fireEvent.keyDown(window, { key: "Enter" });
    expect(location()).toBe("/dojo/teste");
  });

  it("modo foco: sem cabeçalho nem menu flutuante, só o áudio", () => {
    renderShell({ chrome: "focus" });

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Alternar área de estudo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Voltar ao Dojô" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desativar áudio" })).toBeInTheDocument();
  });

  it("tela cheia: conteúdo da atividade + link de volta, sem cabeçalho nem menu flutuante", () => {
    renderShell({ chrome: "takeover" });

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Alternar área de estudo" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao Dojô" })).toBeInTheDocument();
  });
});
