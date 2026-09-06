import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StrokeOrderAnimation from "./StrokeOrderAnimation";
import { getStrokeSteps, kanaStrokeEntriesByChar } from "@/lib/kanaStrokeUtils";

function logicalStrokeCount(strokeIds: string[]) {
  return new Set(strokeIds.map((id) => id.replace(/[a-z]$/, ""))).size;
}

describe("StrokeOrderAnimation", () => {
  it("has drawable fill and reveal paths for every kana stroke", () => {
    const broken: string[] = [];

    for (const [char, entry] of kanaStrokeEntriesByChar) {
      const steps = getStrokeSteps(entry);

      const expectedStrokes = logicalStrokeCount(entry.strokes.map((stroke) => stroke.id));

      if (steps.length !== expectedStrokes) {
        broken.push(`${char}: expected ${expectedStrokes} steps, got ${steps.length}`);
        continue;
      }

      steps.forEach((step, index) => {
        if (!step.fillPath.startsWith("M")) broken.push(`${char} stroke ${index + 1}: missing fill path`);
        if (!step.medianPath.startsWith("M")) broken.push(`${char} stroke ${index + 1}: missing reveal median path`);
        if (step.fillPath === step.medianPath) broken.push(`${char} stroke ${index + 1}: reveal path should not replace filled shape`);
      });
    }

    expect(broken).toEqual([]);
  });

  it("renders a separate visible shape for each completed stroke step", () => {
    const incomplete: string[] = [];

    for (const [char, entry] of kanaStrokeEntriesByChar) {
      const steps = getStrokeSteps(entry);
      for (let visibleStrokes = 1; visibleStrokes <= steps.length; visibleStrokes++) {
        const completed = steps.slice(0, Math.max(0, visibleStrokes - 1));
        const active = steps[visibleStrokes - 1];
        const visibleParts = [...completed.map((step) => step.fillPath), active?.fillPath].filter(Boolean);

        if (visibleParts.length !== visibleStrokes) {
          incomplete.push(`${char}: step ${visibleStrokes}/${steps.length} exposes ${visibleParts.length} parts`);
        }
      }
    }

    expect(incomplete).toEqual([]);
  });

  it("reveals the final curve endpoint for rounded kana", () => {
    const finalEndpoints = new Map([
      ["ぬ", "923,857"],
      ["ね", "952,878"],
      ["る", "590,850"],
    ]);

    for (const [char, endpoint] of finalEndpoints) {
      const entry = kanaStrokeEntriesByChar.get(char);
      expect(entry).toBeDefined();

      const finalStep = getStrokeSteps(entry!).at(-1);
      expect(finalStep?.medianPath).toContain(endpoint);
    }
  });

  it("removes the active mask after the stroke animation finishes", () => {
    vi.useFakeTimers();

    const { container } = render(<StrokeOrderAnimation char="ぬ" autoPlay loop={false} />);

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(container.querySelector('path[mask^="url(#kana-active-"]')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(container.querySelector('path[mask^="url(#kana-active-"]')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("reveals the final stroke outline for rounded kana after drawing", () => {
    vi.useFakeTimers();

    for (const char of ["ぬ", "ね", "る"]) {
      const { container, unmount } = render(<StrokeOrderAnimation char={char} autoPlay loop={false} />);
      const entry = kanaStrokeEntriesByChar.get(char);
      const finalStep = getStrokeSteps(entry!).at(-1)!;

      act(() => {
        vi.advanceTimersByTime(350);
      });

      for (let i = 1; i < getStrokeSteps(entry!).length; i++) {
        act(() => {
          vi.advanceTimersByTime(850);
        });
      }

      act(() => {
        vi.advanceTimersByTime(700);
      });

      const renderedFinalStroke = Array.from(container.querySelectorAll("path")).find(
        (path) => path.getAttribute("d") === finalStep.fillPath,
      );
      expect(renderedFinalStroke).toBeDefined();
      expect(renderedFinalStroke?.getAttribute("mask")).toBeNull();
      unmount();
    }

    vi.useRealTimers();
  });

  it("does not expose the lower sa stroke before the final stroke", () => {
    const sa = kanaStrokeEntriesByChar.get("さ");
    expect(sa).toBeDefined();

    const [firstStroke, secondStroke, thirdStroke] = getStrokeSteps(sa!);

    expect(firstStroke.fillPath).not.toContain("M311 708");
    expect(secondStroke.fillPath).not.toContain("M311 708");
    expect(thirdStroke.fillPath).toContain("M321 700");
  });

  it("advances the displayed stroke counter one stroke at a time", () => {
    vi.useFakeTimers();

    render(<StrokeOrderAnimation char="あ" autoPlay loop={false} />);

    expect(screen.getByText("Traço 0 de 3")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(screen.getByText("Traço 1 de 3")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(850);
    });
    expect(screen.getByText("Traço 2 de 3")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(850);
    });
    expect(screen.getByText("Traço 3 de 3")).toBeInTheDocument();

    vi.useRealTimers();
  });
});
