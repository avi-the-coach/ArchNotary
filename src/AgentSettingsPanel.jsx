import { useState, useEffect } from "react";
import { ProvidersTab } from "./ProvidersTab";
import { AgentsTab } from "./AgentsTab";
import { useConfig } from "./useConfig";
import "./AgentSettingsPanel.css";

const TABS = ["Providers", "Agents"];

/**
 * AgentSettingsPanel — slide-in panel with Providers + Agents tabs.
 * Has its own useConfig instance so changes are saved to disk.
 */
export function AgentSettingsPanel({ onClose }) {
  const [activeTab, setActiveTab] = useState("Providers");

  const {
    providers,
    agents,
    loadConfig,
    checkProvider,
    checkAllProviders,
    saveApiKey,
    updateAgent,
  } = useConfig();

  // Load config + run initial checks when panel opens
  useEffect(() => {
    loadConfig().then((loaded) => checkAllProviders(loaded));
  }, [loadConfig, checkAllProviders]);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <span>⚙️ Agent Settings</span>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
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
          {activeTab === "Providers" ? (
            <ProvidersTab
              providers={providers}
              onSaveKey={saveApiKey}
              onCheck={checkProvider}
            />
          ) : (
            <AgentsTab
              agents={agents}
              providers={providers}
              onUpdate={updateAgent}
            />
          )}
        </div>
      </div>
    </div>
  );
}
