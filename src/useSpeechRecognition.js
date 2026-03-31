import { useRef, useCallback, useEffect } from "react";

/**
 * useSpeechRecognition
 * Wraps Web Speech API (SpeechRecognition).
 * Uses the system's current default recording device.
 * To capture a specific device (e.g. Stereo Mix), change the Windows
 * default recording device BEFORE calling start().
 *
 * @param {object} opts
 * @param {function} opts.onInterim  — called with interim transcript string
 * @param {function} opts.onFinal    — called with final transcript string
 * @param {function} opts.onError    — called with error message string
 */
export function useSpeechRecognition({ onInterim, onFinal, onError, onStart } = {}) {
  const recognitionRef = useRef(null);
  const activeRef = useRef(false);

  const isSupported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = useCallback(() => {
    if (!isSupported) {
      onError?.("Web Speech API is not supported in this browser.");
      return;
    }
    if (activeRef.current) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "he-IL";

    recognition.onstart = () => {
      onStart?.();
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          onFinal?.(transcript.trim());
        } else {
          interim += transcript;
        }
      }
      if (interim) onInterim?.(interim);
    };

    recognition.onerror = (event) => {
      onError?.(event.error);
      activeRef.current = false;
    };

    recognition.onend = () => {
      if (activeRef.current) {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;
    activeRef.current = true;
    recognition.start();
  }, [isSupported, onFinal, onInterim, onError, onStart]);

  const stop = useCallback(() => {
    activeRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  return { start, stop, isSupported };
}
