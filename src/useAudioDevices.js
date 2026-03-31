import { useState, useCallback } from "react";

/**
 * useAudioDevices
 * Enumerates available audio input devices.
 * Requests mic permission first to unlock device labels.
 */
export function useAudioDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Request + immediately release mic permission to unlock device labels
      await navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((s) => s.getTracks().forEach((t) => t.stop()))
        .catch(() => {}); // ignore — labels may be empty without permission

      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs = all.filter((d) => d.kind === "audioinput");
      setDevices(inputs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { devices, loading, error, refresh };
}
