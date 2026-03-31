import { useState, useEffect } from "react";
import { ProvidersTab } from "./ProvidersTab";
import { AgentsTab } from "./AgentsTab";
import { AudioTab } from "./AudioTab";
import { useConfig } from "./useConfig";
import "./AgentSettingsPanel.css";

const TABS = ["Providers", "Agents", "Audio"];

const STORAGE_KEY = "archnotary_audio_device_id";

export function AgentSettingsPanel({ onClose, onDeviceSelect }) {
  const [activeTab, setActiveTab] = useState("Providers");
  const [selectedDeviceId, setSelectedDeviceId] = useState(
    () => localStorage.getItem(STORAGE_KEY) || null
  );

  const {
    providers,
    agents,
    loadConfig,
    checkProvider,
    checkAllProviders,
    saveApiKey,
    updateAgent,
  } = useConfig();

  useEffect(() => {
    loadConfig().then((loaded) => checkAllProviders(loaded));
  }, [loadConfig, checkAllProviders]);

  const handleDeviceSelect = (deviceId) => {
    setSelectedDeviceId(deviceId);
    if (deviceId) {
      localStorage.setItem(STORAGE_KEY, deviceId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    onDeviceSelect?.(deviceId);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <span>⚙️ Agent Settings</span>
          <button className="settings-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              className={`settings-tab ${activeTab === t ? "active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="settings-body">
          {activeTab === "Providers" && (
            <ProvidersTab
              providers={providers}
              onSaveKey={saveApiKey}
              onCheck={checkProvider}
            />
          )}
          {activeTab === "Agents" && (
            <AgentsTab
              agents={agents}
              providers={providers}
              onUpdate={updateAgent}
            />
          )}
          {activeTab === "Audio" && (
            <AudioTab
              selectedDeviceId={selectedDeviceId}
              onSelect={handleDeviceSelect}
            />
          )}
        </div>
      </div>
    </div>
  );
}
