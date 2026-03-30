import "./Header.css";

/**
 * Header — top bar with logo, voice toggle, new-doc button, settings.
 * Props:
 *   isRecording  {boolean}   — mic active state
 *   onVoiceToggle {fn}       — toggle mic on/off
 *   onNewDocument {fn}       — start new document/session
 *   onSettings    {fn}       — open Agent Settings Panel
 */
export function Header({ isRecording, onVoiceToggle, onNewDocument, onSettings, onBack }) {
  return (
    <header className="app-header">
      {/* Back button */}
      {onBack && (
        <button className="btn-back" onClick={onBack} title="Sessions">
          ←
        </button>
      )}

      {/* Logo + name */}
      <div className="header-brand">
        <div className="logo">
          <img src="/assets/ArchNotary.png" alt="ArchNotary" className="logo-img" />
        </div>
        <div>
          <div className="app-name">The Notary</div>
          <div className="app-sub">Remember what matters.</div>
        </div>
      </div>

      <div className="header-spacer" />

      {/* Controls */}
      <div className="header-controls">
        {/* 🎤 Voice Start/Stop */}
        <button
          className={`btn-voice ${isRecording ? "recording" : ""}`}
          onClick={onVoiceToggle}
          title={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? "⏹ Stop" : "🎤 Start"}
        </button>

        {/* 📄 New Document */}
        <button
          className="btn-icon"
          onClick={onNewDocument}
          title="New Document"
        >
          📄
        </button>

        {/* ⚙️ Settings */}
        <button
          className="btn-icon"
          onClick={onSettings}
          title="Agent Settings"
        >
          ⚙️
        </button>
      </div>
    </header>
  );
}
