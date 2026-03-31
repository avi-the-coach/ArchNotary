import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAudioDevices } from "./useAudioDevices";
import "./AudioTab.css";

export function AudioTab({ selectedDeviceId, onSelect }) {
  const { devices, loading, error, refresh } = useAudioDevices();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasStereoMix = devices.some((d) =>
    /stereo mix|what u hear|loopback/i.test(d.label)
  );

  const openSoundSettings = async () => {
    try {
      await invoke("open_sound_settings");
    } catch (e) {
      console.warn("Could not open sound settings:", e);
    }
  };

  return (
    <div className="audio-tab">
      <div className="audio-tab-header">
        <span className="audio-tab-title">Audio Input Device</span>
        <button className="audio-refresh" onClick={refresh} title="Refresh">
          ↻
        </button>
      </div>

      {loading && <div className="audio-status">סורק מכשירים…</div>}
      {error && <div className="audio-status audio-error">{error}</div>}

      <div className="audio-devices">
        {/* Default option */}
        <div
          className={`audio-device ${!selectedDeviceId ? "selected" : ""}`}
          onClick={() => onSelect(null)}
        >
          <span className="audio-device-icon">🎤</span>
          <span className="audio-device-name">מיקרופון ברירת מחדל</span>
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
          <div className="audio-status">לא נמצאו מכשירי קלט.</div>
        )}
      </div>

      {/* Hint + action */}
      {hasStereoMix ? (
        <div className="audio-hint stereo-available">
          ✅ Stereo Mix זמין — בחר אותו כדי לקלוט גם את קול Zoom
        </div>
      ) : (
        <div className="audio-hint">
          <div className="audio-hint-text">
            💡 כדי לקלוט שמע מ-Zoom: יש להפעיל את <strong>Stereo Mix</strong> בהגדרות הקול של Windows.
            <br />
            לחץ על הכפתור → ימין קליק על אזור ריק → <em>Show Disabled Devices</em> → ימין קליק על <strong>Stereo Mix</strong> → <em>Enable</em>
            <br />
            אחר כך לחץ ↻ כאן.
          </div>
          <button className="audio-open-settings" onClick={openSoundSettings}>
            🔧 פתח הגדרות קול של Windows
          </button>
        </div>
      )}
    </div>
  );
}
