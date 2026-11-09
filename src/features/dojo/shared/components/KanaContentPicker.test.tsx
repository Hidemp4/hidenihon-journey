import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAvailableGroups } from "../kanaDeck";
import { KanaGroupsPanel } from "./KanaContentPicker";

afterEach(cleanup);

const HIRAGANA_GROUPS = getAvailableGroups("hiragana");

function renderPanel(selectedGroupIds: string[], onToggle = vi.fn(), onSelectAll = vi.fn()) {
  render(<KanaGroupsPanel alphabet="hiragana" groups={HIRAGANA_GROUPS} selectedGroupIds={selectedGroupIds} onSelectAll={onSelectAll} onToggle={onToggle} />);
  return { onToggle, onSelectAll };
}

describe("grupos nas configurações avançadas (todas as atividades)", () => {
  it("fechado por padrão, com o resumo do que vale: todos, ou até 3 nomes e +N", () => {
    renderPanel([]);
    expect(screen.getByRole("button", { name: /Abrir configurações avançadas/ })).toHaveAccessibleName(/Grupos de kana: todos/);
    cleanup();

    renderPanel(HIRAGANA_GROUPS.slice(0, 5).map((group) => group.id));
    expect(screen.getByRole("button", { name: /Abrir/ })).toHaveAccessibleName(/Grupos de kana: あ行, か行, さ行 \+2/);
  });

  it("abre e fecha pelo mesmo botão (aria-expanded), e as escolhas vão para a atividade", () => {
    const { onToggle, onSelectAll } = renderPanel([]);
    const toggle = screen.getByRole("button", { name: /Abrir configurações avançadas/ });
    const region = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
    expect(region).toHaveAttribute("hidden");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(region).not.toHaveAttribute("hidden");
    expect(screen.getByRole("heading", { name: "Grupos de kana" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "た行" }));
    fireEvent.click(screen.getByRole("button", { name: "Todos" }));
    expect(onToggle).toHaveBeenCalledWith(HIRAGANA_GROUPS[3].id);
    expect(onSelectAll).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Fechar configurações avançadas/ }));
    expect(screen.queryByRole("button", { name: "た行" })).not.toBeInTheDocument();
  });
});
