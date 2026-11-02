import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSaveOnExit } from "./useSaveOnExit";

function firePageHide(persisted: boolean) {
  const event = new Event("pagehide");
  Object.defineProperty(event, "persisted", { value: persisted });
  act(() => {
    window.dispatchEvent(event);
  });
}

describe("useSaveOnExit", () => {
  it("grava o pendente mais recente ao desmontar", () => {
    const save = vi.fn();
    const { rerender, unmount } = renderHook(({ pending }) => useSaveOnExit(pending, save), {
      initialProps: { pending: null as string | null },
    });

    rerender({ pending: "1 resposta" });
    rerender({ pending: "3 respostas" });
    unmount();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("3 respostas");
  });

  it("não grava nada sem pendente", () => {
    const save = vi.fn();
    const { unmount } = renderHook(() => useSaveOnExit(null, save));
    unmount();
    expect(save).not.toHaveBeenCalled();
  });

  it("no pagehide grava só quando a página é descartada (não no cache de voltar/avançar)", () => {
    const save = vi.fn();
    const { unmount } = renderHook(() => useSaveOnExit("pendente", save));

    firePageHide(true);
    expect(save).not.toHaveBeenCalled();
    firePageHide(false);
    expect(save).toHaveBeenCalledWith("pendente");

    unmount();
    firePageHide(false);
    expect(save).toHaveBeenCalledTimes(2); // o da desmontagem; depois dela o listener já saiu
  });
});
