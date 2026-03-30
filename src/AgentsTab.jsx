import { useState } from "react";
import "./SettingsTabs.css";

export function AgentsTab({ agents, providers, onUpdate }) {
  const [editing, setEditing] = useState(null);

  const getProviderStatus = (agent) => {
    if (!agent.providerId) return "⚠️";
    return providers.find((p) => p.id === agent.providerId) ? "✅" : "⚠️";
  };

  const handleSave = async () => {
    if (!editing) return;
    await onUpdate(editing);
    setEditing(null);
  };

  const toggleActive = (agent) => {
    onUpdate({ ...agent, active: !agent.active });
  };

  return (
    <div className="tab-content">
      <div className="tab-section-header">
        <span>Agents</span>
      </div>

      {agents.map((a) => (
        <div key={a.id} className={`agent-row ${a.locked ? "locked" : ""}`}>
          <div className="agent-left">
            {/* Active toggle (not for stenographer) */}
            {!a.locked && (
              <input
                type="checkbox"
                checked={a.active}
                onChange={() => toggleActive(a)}
                title="Active in sessions"
              />
            )}
            <span className="agent-icon">{a.icon}</span>
            <div>
              <div className="agent-name">
                {a.name}
                {a.locked && <span className="agent-badge">locked</span>}
              </div>
              <div className="agent-sub">
                {getProviderStatus(a)} {providers.find((p) => p.id === a.providerId)?.name ?? "no provider"}
              </div>
            </div>
          </div>
          <button className="btn-sm" onClick={() => setEditing({ ...a })}>
            Edit
          </button>
        </div>
      ))}

      {editing && (
        <div className="provider-form">
          <div className="form-title">{editing.icon} {editing.name}</div>

          <label>Provider
            <select
              value={editing.providerId ?? ""}
              onChange={(e) => setEditing({ ...editing, providerId: e.target.value || null })}
            >
              <option value="">— None —</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <label>Model
            <input
              value={editing.model ?? ""}
              onChange={(e) => setEditing({ ...editing, model: e.target.value })}
              placeholder="e.g. gpt-4o, claude-3-5-sonnet"
            />
          </label>

          {/* Instructions only editable for non-locked agents */}
          {!editing.locked && (
            <label>Instructions
              <textarea
                rows={5}
                value={editing.instructions ?? ""}
                onChange={(e) => setEditing({ ...editing, instructions: e.target.value })}
              />
            </label>
          )}

          <div className="form-actions">
            <button className="btn-sm" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-sm primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
