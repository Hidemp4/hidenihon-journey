import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "./test/memoryStorage";
import { CUE_TONES, useArenaAudio } from "./useArenaAudio";

function createFakeOscillator() {
  return {
    type: "" as OscillatorType,
    frequency: {
      value: null as number | null,
      setValueAtTime(value: number) {
        this.value = value;
      },
    },
    onended: null,
    connect: (node: unknown) => node,
    disconnect: () => {},
    start: () => {},
    stop: () => {},
  };
}

/** Só o pedaço do Web Audio que o hook usa: dá para contar quantos tons foram tocados. */
class FakeAudioContext {
  static oscillators: Array<ReturnType<typeof createFakeOscillator>> = [];
  state = "running";
  currentTime = 0;
  destination = {};

  createOscillator() {
    const oscillator = createFakeOscillator();
    FakeAudioContext.oscillators.push(oscillator);
    return oscillator;
  }

  createGain() {
    return {
      gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: (node: unknown) => node,
      disconnect: () => {},
    };
  }

  resume() {
    return Promise.resolve();
  }

  close() {
    return Promise.resolve();
  }
}

describe("useArenaAudio: efeitos curtos", () => {
  beforeEach(() => {
    FakeAudioContext.oscillators = [];
    vi.stubGlobal("localStorage", createMemoryStorage());
    vi.stubGlobal("AudioContext", FakeAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("toca os tons do efeito pedido", async () => {
    const { result } = renderHook(() => useArenaAudio());

    await act(async () => {
      await result.current.playCue("match");
    });

    expect(FakeAudioContext.oscillators.map((oscillator) => oscillator.frequency.value)).toEqual(
      CUE_TONES.match.map((tone) => tone.frequency)
    );
  });

  it("respeita o mudo global, inclusive o que já estava salvo", async () => {
    const { result } = renderHook(() => useArenaAudio());
    act(() => result.current.toggle());

    await act(async () => {
      await result.current.playCue("flip");
      await result.current.playCue("seal");
    });
    expect(FakeAudioContext.oscillators).toHaveLength(0);
    expect(localStorage.getItem("hidenihon:kana-reaction:audio")).toBe("off");

    const remounted = renderHook(() => useArenaAudio());
    expect(remounted.result.current.enabled).toBe(false);
    await act(async () => {
      await remounted.result.current.playCue("match");
    });
    expect(FakeAudioContext.oscillators).toHaveLength(0);
  });

  it("mantém os efeitos curtos e baixos (tocam a cada clique)", () => {
    for (const tones of Object.values(CUE_TONES)) {
      expect(tones.length).toBeGreaterThan(0);
      for (const tone of tones) {
        expect(tone.gain).toBeLessThanOrEqual(0.08);
        expect(tone.offset + tone.duration).toBeLessThanOrEqual(0.3);
      }
    }
  });
});
