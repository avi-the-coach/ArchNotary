import { useRef, useCallback, useEffect } from "react";

/**
 * useSpeechRecognition
 * Wraps Web Speech API (SpeechRecognition).
 *
 * When deviceId is provided, primes the Chromium media pipeline by
 * calling getUserMedia({ deviceId }) before starting recognition.
 * This causes WebView2/Chrome to use that device for Web Speech API.
 *
 * @param {object} opts
 * @param {function} opts.onInterim  — called with interim transcript string
 * @param {function} opts.onFinal    — called with final transcript string
 * @param {function} opts.onError    — called with error message string
 * @param {string}   opts.deviceId   — optional: specific audio input device ID
 */
export function useSpeechRecognition({ onInterim, onFinal, onError, deviceId } = {}) {
  const recognitionRef = useRef(null);
  const activeRef = useRef(false);
  const primedStreamRef = useRef(null); // stream from getUserMedia (to keep device active)

  const isSupported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = useCallback(async () => {
    if (!isSupported) {
      onError?.("Web Speech API is not supported in this browser.");
      return;
    }
    if (activeRef.current) return;

    // Prime Chromium with the selected device before starting recognition
    if (deviceId) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
        });
        primedStreamRef.current = stream;
      } catch (e) {
        onError?.(`Cannot access audio device: ${e.message}`);
        return;
      }
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "he-IL";

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
  }, [isSupported, onFinal, onInterim, onError, deviceId]);

  const stop = useCallback(() => {
    activeRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    // Release the primed device stream
    primedStreamRef.current?.getTracks().forEach((t) => t.stop());
    primedStreamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      recognitionRef.current?.stop();
      primedStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { start, stop, isSupported };
}
