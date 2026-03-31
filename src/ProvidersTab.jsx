/**
 * ProvidersTab — fixed list of 4 predefined providers.
 *
 * - No Add / Delete buttons — providers are hardcoded.
 * - API providers: user enters only API key. Save → auto-check → status dot.
 * - Claude SDK: auto-detected. Manual Recheck button.
 * - Status dot: green (ok) / red (error) / gray (not configured).
 * - Error message shown inline below provider name.
 */

import { useState } from "react";
import "./SettingsTabs.css";

function StatusDot({ status }) {
  if (status === "ok")    return <span className="status-dot status-ok"  title="Connected" />;
  if (status === "error") return <span className="status-dot status-err" title="Error" />;
  return                         <span className="status-dot status-none" title="Not configured" />;
}

export function ProvidersTab({ providers, onSaveKey, onCheck }) {
  const [editingId, setEditingId]   = useState(null);
  const [keyDraft,  setKeyDraft]    = useState("");
  const [checking,  setChecking]    = useState(null); // provider id being checked

  const handleEdit = (p) => {
    setEditingId(p.id);
    setKeyDraft(p.apiKey ?? "");
  };

  const handleCancel = () => {
    setEditingId(null);
    setKeyDraft("");
  };

  const handleSave = async (id) => {
    setChecking(id);
    await onSaveKey(id, keyDraft);
    setEditingId(null);
    setKeyDraft("");
    setChecking(null);
  };

  const handleRecheck = async (id) => {
    setChecking(id);
    await onCheck(id);
    setChecking(null);
  };

  return (
    <div className="tab-content">
      <div className="tab-section-header">
        <span>AI Providers</span>
      </div>

      {providers.map((p) => (
        <div key={p.id} className="provider-row provider-row-v2">

          {/* Left: status dot + info */}
          <div className="provider-info">
            <StatusDot status={p.status} />
            <div className="provider-info-text">
              <div className="provider-name-line">
                <span className="provider-icon">{p.icon}</span>
                <span className="provider-name">{p.name}</span>
                {p.status === "ok" && p.models.length > 0 && (
                  <span className="provider-models-badge">
                    {p.models.length} models
                  </span>
                )}
                {checking === p.id && (
                  <span className="provider-checking">⏳</span>
                )}
              </div>

              {p.statusAt && (
                <span className="provider-endpoint">
                  Last checked {p.statusAt}
                </span>
              )}

              {p.status === "error" && (
                <div className="provider-error">{p.statusMsg}</div>
              )}

              {/* Inline API key form */}
              {!p.sdkOnly && editingId === p.id && (
                <div className="key-edit-row">
                  <input
                    type="password"
                    className="key-input"
                    value={keyDraft}
                    onChange={(e) => setKeyDraft(e.target.value)}
                    placeholder="Paste API key…"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave(p.id);
                      if (e.key === "Escape") handleCancel();
                    }}
                  />
                  <button className="btn-sm" onClick={handleCancel}>✕</button>
                  <button
                    className="btn-sm primary"
                    onClick={() => handleSave(p.id)}
                    disabled={checking === p.id}
                  >
                    Save &amp; Connect
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="provider-actions">
            {!p.sdkOnly && editingId !== p.id && (
              <button className="btn-sm" onClick={() => handleEdit(p)}>
                {p.apiKey ? "Edit Key" : "+ Add Key"}
              </button>
            )}
            {(p.sdkOnly || (p.apiKey && editingId !== p.id)) && (
              <button
                className="btn-sm"
                onClick={() => handleRecheck(p.id)}
                disabled={checking === p.id}
              >
                Recheck
              </button>
            )}
          </div>

        </div>
      ))}
    </div>
  );
}
