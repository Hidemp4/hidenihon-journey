import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIO_SOURCES, MUSIC_DUCKED_VOLUME, MUSIC_VOLUME } from "./constants";
import { loadAudioEnabled, saveAudioEnabled } from "./localRepository";
import type { AttemptOutcome } from "./types";

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? window.webkitAudioContext ?? null;
}

/** Bipes sintetizados (contagem regressiva e feedback de acerto/erro). */
function playTone(
  context: AudioContext,
  frequency: number,
  startsAt: number,
  duration: number,
  gainValue: number,
  type: OscillatorType = "sine"
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startsAt);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(gainValue, startsAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.03);
}

function createMedia(src: string): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  const media = new Audio(src);
  media.preload = "auto";
  return media;
}

export function useArenaAudio() {
  const [enabled, setEnabled] = useState(loadAudioEnabled);
  const enabledRef = useRef(enabled);
  const contextRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const musicDelayRef = useRef<number | null>(null);
  const voiceRef = useRef<HTMLAudioElement | null>(null);

  // ---- bipes (Web Audio) ----------------------------------------------------

  const getContext = useCallback(async () => {
    const Constructor = getAudioContextConstructor();
    if (!Constructor) return null;

    contextRef.current ??= new Constructor();
    const context = contextRef.current;

    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch {
        return null;
      }
    }

    return context;
  }, []);

  /** Chame dentro de um clique para liberar o áudio no navegador. */
  const unlock = useCallback(async () => {
    if (!enabledRef.current) return;
    await getContext();
  }, [getContext]);

  const playCountdownBeat = useCallback(
    async (final = false) => {
      if (!enabledRef.current) return;
      const context = await getContext();
      if (!context) return;

      const now = context.currentTime;
      playTone(context, final ? 523.25 : 196, now, final ? 0.5 : 0.16, final ? 0.12 : 0.08, final ? "sawtooth" : "square");
      if (final) playTone(context, 783.99, now + 0.04, 0.45, 0.08, "triangle");
    },
    [getContext]
  );

  const playFeedback = useCallback(
    async (outcome: AttemptOutcome) => {
      if (!enabledRef.current) return;
      const context = await getContext();
      if (!context) return;

      const now = context.currentTime;
      if (outcome === "correct") {
        playTone(context, 880, now, 0.1, 0.05, "sine");
        playTone(context, 1318.5, now + 0.06, 0.12, 0.04, "sine");
      } else if (outcome === "wrong") {
        playTone(context, 150, now, 0.22, 0.07, "sawtooth");
      } else {
        playTone(context, 240, now, 0.14, 0.06, "square");
        playTone(context, 180, now + 0.16, 0.2, 0.06, "square");
      }
    },
    [getContext]
  );

  // ---- trilha do lobby (arquivo mp3 em loop) --------------------------------

  const getMusic = useCallback(() => {
    if (!musicRef.current) {
      const music = createMedia(AUDIO_SOURCES.lobbyMusic);
      if (music) {
        music.loop = true; // ao terminar, recomeça sozinho
        music.volume = MUSIC_VOLUME;
      }
      musicRef.current = music;
    }
    return musicRef.current;
  }, []);

  const clearMusicDelay = useCallback(() => {
    if (musicDelayRef.current != null) {
      window.clearTimeout(musicDelayRef.current);
      musicDelayRef.current = null;
    }
  }, []);

  /**
   * `delayMs > 0`: a trilha começa MUDA dentro do gesto do clique (o navegador libera o play)
   * e o som é "solto" depois do atraso, sempre do início da música.
   */
  const startLobbyMusic = useCallback(
    async (delayMs = 0) => {
      if (!enabledRef.current) return;

      const music = getMusic();
      // `paused` vira false assim que play() é chamado, então chamadas repetidas não duplicam a trilha.
      if (!music || !music.paused) return;

      if (delayMs > 0) {
        music.muted = true;
        music.currentTime = 0;
        musicDelayRef.current = window.setTimeout(() => {
          musicDelayRef.current = null;
          music.currentTime = 0;
          music.muted = false;
        }, delayMs);
      }

      try {
        await music.play();
      } catch {
        // Bloqueado pelo navegador, interrompido por um stop ou arquivo ausente.
        clearMusicDelay();
        music.muted = false;
      }
    },
    [clearMusicDelay, getMusic]
  );

  const stopLobbyMusic = useCallback(() => {
    clearMusicDelay();
    const music = musicRef.current;
    if (music) {
      music.muted = false;
      music.pause();
    }
  }, [clearMusicDelay]);

  // ---- "yooo" (efeito de voz dos botões) ------------------------------------

  const getVoice = useCallback(() => {
    if (!voiceRef.current) {
      const voice = createMedia(AUDIO_SOURCES.yooo);
      if (voice) {
        const restoreMusicVolume = () => {
          if (musicRef.current) musicRef.current.volume = MUSIC_VOLUME;
        };
        voice.addEventListener("ended", restoreMusicVolume);
        voice.addEventListener("error", restoreMusicVolume);
      }
      voiceRef.current = voice;
    }
    return voiceRef.current;
  }, []);

  const playYooo = useCallback(async () => {
    if (!enabledRef.current) return;

    const voice = getVoice();
    if (!voice) return;

    // Abaixa a trilha enquanto o "yooo" toca para ele não ser abafado.
    if (musicRef.current) musicRef.current.volume = MUSIC_DUCKED_VOLUME;
    voice.currentTime = 0;

    try {
      await voice.play();
    } catch {
      if (musicRef.current) musicRef.current.volume = MUSIC_VOLUME;
    }
  }, [getVoice]);

  // ---- ciclo de vida --------------------------------------------------------

  const toggle = useCallback(() => setEnabled((current) => !current), []);

  useEffect(() => {
    enabledRef.current = enabled;
    saveAudioEnabled(enabled);

    if (!enabled) {
      stopLobbyMusic();
      voiceRef.current?.pause();
    }
  }, [enabled, stopLobbyMusic]);

  useEffect(
    () => () => {
      if (musicDelayRef.current != null) window.clearTimeout(musicDelayRef.current);
      musicRef.current?.pause();
      voiceRef.current?.pause();
      musicRef.current = null;
      voiceRef.current = null;

      const context = contextRef.current;
      contextRef.current = null; // evita reaproveitar um contexto já fechado (HMR / StrictMode)
      void context?.close();
    },
    []
  );

  return {
    enabled,
    toggle,
    unlock,
    startLobbyMusic,
    stopLobbyMusic,
    playYooo,
    playCountdownBeat,
    playFeedback,
  };
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
