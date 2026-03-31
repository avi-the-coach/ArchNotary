import { useEffect } from "react";
import { useAudioDevices } from "./useAudioDevices";
import "./AudioTab.css";

/**
 * AudioTab — device picker for audio input.
 * Detects Stereo Mix and highlights it.
 */
export function AudioTab({ selectedDeviceId, onSelect }) {
  const { devices, loading, error, refresh } = useAudioDevices();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasStereoMix = devices.some((d) =>
    /stereo mix|what u hear|loopback/i.test(d.label)
  );

  return (
    <div className="audio-tab">
      <div className="audio-tab-header">
        <span className="audio-tab-title">Audio Input Device</span>
        <button className="audio-refresh" onClick={refresh} title="Refresh">
          ↻
        </button>
      </div>

      {loading && <div className="audio-status">Scanning devices…</div>}
      {error && <div className="audio-status audio-error">{error}</div>}

      <div className="audio-devices">
        {/* Default option */}
        <div
          className={`audio-device ${!selectedDeviceId ? "selected" : ""}`}
          onClick={() => onSelect(null)}
        >
          <span className="audio-device-icon">🎤</span>
          <span className="audio-device-name">Default Microphone</span>
          {!selectedDeviceId && <span className="audio-check">✓</span>}
        </div>

        {devices.map((device) => {
          const isStereoMix = /stereo mix|what u hear|loopback/i.test(
            device.label
          );
          const isSelected = selectedDeviceId === device.deviceId;
          return (
            <div
              key={device.deviceId}
              className={`audio-device ${isSelected ? "selected" : ""} ${
                isStereoMix ? "stereo-mix" : ""
              }`}
              onClick={() => onSelect(device.deviceId)}
            >
              <span className="audio-device-icon">
                {isStereoMix ? "🔊" : "🎤"}
              </span>
              <span className="audio-device-name">
                {device.label || `Device ${device.deviceId.slice(0, 8)}`}
                {isStereoMix && (
                  <span className="stereo-badge">Stereo Mix</span>
                )}
              </span>
              {isSelected && <span className="audio-check">✓</span>}
            </div>
          );
        })}

        {!loading && devices.length === 0 && (
          <div className="audio-status">No audio input devices found.</div>
        )}
      </div>

      {/* Hint */}
      {hasStereoMix ? (
        <div className="audio-hint stereo-available">
          ✅ Stereo Mix detected — select it to capture Zoom + microphone
        </div>
      ) : (
        <div className="audio-hint">
          💡 To capture Zoom audio: Windows Sound Settings → Recording →
          right-click empty area → Show Disabled Devices → enable{" "}
          <strong>Stereo Mix</strong>, then refresh here.
        </div>
      )}
    </div>
  );
}
