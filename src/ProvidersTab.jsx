import { useState } from "react";
import "./SettingsTabs.css";

const EMPTY_PROVIDER = { id: "", name: "", endpoint: "", apiKey: "", type: "openai" };

function newId() {
  return `provider_${Date.now()}`;
}

async function testConnection(provider) {
  try {
    const res = await fetch(`${provider.endpoint}/models`, {
      headers: { Authorization: `Bearer ${provider.apiKey}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function ProvidersTab({ providers, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(null); // null | provider object
  const [testResult, setTestResult] = useState({}); // providerId → "ok"|"fail"|"testing"

  const handleAdd = () => {
    setEditing({ ...EMPTY_PROVIDER, id: newId() });
  };

  const handleSave = async () => {
    if (!editing) return;
    await onUpdate(editing);
    setEditing(null);
  };

  const handleTest = async (provider) => {
    setTestResult((p) => ({ ...p, [provider.id]: "testing" }));
    const ok = await testConnection(provider);
    setTestResult((p) => ({ ...p, [provider.id]: ok ? "ok" : "fail" }));
  };

  return (
    <div className="tab-content">
      <div className="tab-section-header">
        <span>AI Providers</span>
        <button className="btn-tab-add" onClick={handleAdd}>+ Add</button>
      </div>

      {providers.length === 0 && !editing && (
        <p className="tab-empty">No providers configured yet.</p>
      )}

      {providers.map((p) => (
        <div key={p.id} className="provider-row">
          <div className="provider-info">
            <span className="provider-name">{p.name}</span>
            <span className="provider-endpoint">{p.endpoint}</span>
          </div>
          <div className="provider-actions">
            <span className={`test-status test-${testResult[p.id] ?? "idle"}`}>
              {testResult[p.id] === "testing" ? "⏳" :
               testResult[p.id] === "ok" ? "✅" :
               testResult[p.id] === "fail" ? "❌" : ""}
            </span>
            <button className="btn-sm" onClick={() => handleTest(p)}>Test</button>
            <button className="btn-sm" onClick={() => setEditing(p)}>Edit</button>
            <button className="btn-sm danger" onClick={() => onDelete(p.id)}>✕</button>
          </div>
        </div>
      ))}

      {editing && (
        <div className="provider-form">
          <label>Name
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="My Provider" />
          </label>
          <label>Endpoint
            <input value={editing.endpoint} onChange={(e) => setEditing({ ...editing, endpoint: e.target.value })} placeholder="https://api.openai.com/v1" />
          </label>
          <label>API Key
            <input type="password" value={editing.apiKey} onChange={(e) => setEditing({ ...editing, apiKey: e.target.value })} placeholder="sk-..." />
          </label>
          <div className="form-actions">
            <button className="btn-sm" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-sm primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
