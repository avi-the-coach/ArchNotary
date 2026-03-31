/**
 * AgentsTab — 4 fixed agents.
 * Model dropdown uses the provider's fetched models list (not hardcoded).
 * Falls back to text input if no models fetched yet.
 */

import { useState } from "react";
import "./SettingsTabs.css";

export function AgentsTab({ agents, providers, onUpdate }) {
  const [editing, setEditing] = useState(null);

  const getProviderStatus = (agent) => {
    if (!agent.providerId) return "⚠️";
    const p = providers.find((p) => p.id === agent.providerId);
    if (!p) return "⚠️";
    if (p.status === "ok")    return "✅";
    if (p.status === "error") return "❌";
    return "⚠️";
  };

  const handleSave = async () => {
    if (!editing) return;
    await onUpdate(editing);
    setEditing(null);
  };

  const toggleActive = (agent) => {
    onUpdate({ ...agent, active: !agent.active });
  };

  // Model selector: dropdown if provider has fetched models, else text input
  const ModelField = ({ editing, providers, onChange }) => {
    const prov   = providers.find((p) => p.id === editing.providerId);
    const models = prov?.models ?? [];

    if (models.length > 0) {
      return (
        <select
          value={editing.model ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— Select model —</option>
          {models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        value={editing.model ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          editing.providerId
            ? "Connect provider to load models…"
            : "Select a provider first"
        }
      />
    );
  };

  return (
    <div className="tab-content">
      <div className="tab-section-header">
        <span>Agents</span>
      </div>

      {agents.map((a) => (
        <div key={a.id} className={`agent-row ${a.locked ? "locked" : ""}`}>
          <div className="agent-left">
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
                {getProviderStatus(a)}{" "}
                {providers.find((p) => p.id === a.providerId)?.name ?? "no provider"}
                {a.model ? ` · ${a.model}` : ""}
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
              onChange={(e) =>
                setEditing({
                  ...editing,
                  providerId: e.target.value || null,
                  model: "",      // reset model when provider changes
                })
              }
            >
              <option value="">— None —</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                  {p.status === "ok" ? " ✅" : p.status === "error" ? " ❌" : ""}
                </option>
              ))}
            </select>
          </label>

          <label>Model
            <ModelField
              editing={editing}
              providers={providers}
              onChange={(m) => setEditing({ ...editing, model: m })}
            />
          </label>

          {!editing.locked && (
            <label>Instructions
              <textarea
                rows={5}
                value={editing.instructions ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, instructions: e.target.value })
                }
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
