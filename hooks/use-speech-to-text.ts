import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Minimal ambient typing for the Web Speech API — not in TypeScript's DOM
 * lib. Chrome/Edge/Safari ship `webkitSpeechRecognition`; Firefox has
 * neither, which `isSupported` below accounts for.
 */
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

// Support never changes over a page's lifetime, so there's nothing to
// subscribe to — this only exists to give useSyncExternalStore a way to
// read `window` that's safe during SSR (getServerSnapshot below) without
// the render/effect timing issues a plain useState+useEffect pair would hit.
function subscribe() {
  return () => {};
}
function getSnapshot() {
  return Boolean(getSpeechRecognitionCtor());
}
function getServerSnapshot() {
  return false;
}

/**
 * Voice-to-text for the chat's free-text steps: press the mic, speak,
 * `onTranscript` fires with the running transcript as it's recognised. This
 * is transcription only — nothing here understands the words, it just turns
 * speech into the same text the typed flow already handles.
 */
export function useSpeechToText(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const isSupported = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  });

  function start() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = "en-IE";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      onTranscriptRef.current(text);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function stop() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  return { listening, isSupported, start, stop };
}
