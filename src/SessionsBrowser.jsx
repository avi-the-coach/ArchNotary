import "./SessionsBrowser.css";

/**
 * SessionsBrowser — home screen listing past sessions.
 * Props:
 *   sessions   {Array}  — list of session objects (populated in Story 3.2)
 *   onNew      {fn}     — start a new session
 *   onOpen     {fn(id)} — open/resume an existing session
 *   onDelete   {fn(id)} — delete a session
 */
export function SessionsBrowser({ sessions = [], onNew, onOpen, onDelete }) {
  return (
    <div className="sessions-browser">
      <div className="sessions-header">
        <div className="sessions-title">
          <span className="sessions-logo">🎙️</span>
          <div>
            <div className="sessions-app-name">The Notary</div>
            <div className="sessions-app-sub">Remember what matters.</div>
          </div>
        </div>
        <button className="btn-new-session" onClick={onNew}>
          ＋ New Session
        </button>
      </div>

      <div className="sessions-list">
        {sessions.length === 0 ? (
          <div className="sessions-empty">
            <span className="sessions-empty-icon">📄</span>
            <p>No sessions yet.</p>
            <p className="sessions-empty-sub">Click "New Session" to start recording.</p>
          </div>
        ) : (
          sessions.map((s) => (
            <div key={s.id} className="session-row">
              <div className="session-info">
                <div className="session-name">{s.name || "Untitled Session"}</div>
                <div className="session-meta">
                  {s.date} · {s.duration || "—"}
                </div>
              </div>
              <div className="session-actions">
                <button className="btn-session-action" onClick={() => onOpen(s.id)}>
                  Open
                </button>
                <button
                  className="btn-session-action danger"
                  onClick={() => onDelete(s.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
