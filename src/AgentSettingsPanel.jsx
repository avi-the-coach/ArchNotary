import "./AgentSettingsPanel.css";

/**
 * AgentSettingsPanel — placeholder (implemented in Stories 5.1 / 5.2)
 */
export function AgentSettingsPanel({ onClose }) {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <span>⚙️ Agent Settings</span>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>
        <div className="settings-body">
          <p className="settings-placeholder">
            Coming in Story 5.1 — Providers & Agents configuration.
          </p>
        </div>
      </div>
    </div>
  );
}
