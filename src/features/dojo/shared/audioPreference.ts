import { readRaw, writeRaw } from "./storage";

// Chave herdada da Arena de Reflexos: é o "mudo" global do dojô e não pode mudar de nome,
// senão quem já desligou o som voltaria a ouvir tudo.
const AUDIO_KEY = "hidenihon:kana-reaction:audio";

export function loadAudioEnabled(): boolean {
  return readRaw(AUDIO_KEY) !== "off";
}

export function saveAudioEnabled(enabled: boolean) {
  writeRaw(AUDIO_KEY, enabled ? "on" : "off");
}
