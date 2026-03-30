import { useState, useEffect } from "react";
import { ProvidersTab } from "./ProvidersTab";
import { AgentsTab } from "./AgentsTab";
import { useConfig } from "./useConfig";
import "./AgentSettingsPanel.css";

const TABS = ["Providers", "Agents"];

/**
 * AgentSettingsPanel — slide-in panel with Providers + Agents tabs.
 */
export function AgentSettingsPanel({ onClose }) {
  const [activeTab, setActiveTab] = useState("Providers");
  const { config, loaded, loadConfig, updateProvider, deleteProvider, updateAgent } = useConfig();

  useEffect(() => { loadConfig(); }, [loadConfig]);

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
          {!loaded ? (
            <p className="settings-placeholder">Loading…</p>
          ) : activeTab === "Providers" ? (
            <ProvidersTab
              providers={config.providers}
              onUpdate={updateProvider}
              onDelete={deleteProvider}
            />
          ) : (
            <AgentsTab
              agents={config.agents}
              providers={config.providers}
              onUpdate={updateAgent}
            />
          )}
        </div>
      </div>
    </div>
  );
}
