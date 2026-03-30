import { useState, useRef, useCallback } from "react";
import { Header } from "./Header";
import { Resizer } from "./Resizer";
import { SessionsBrowser } from "./SessionsBrowser";
import { AgentSettingsPanel } from "./AgentSettingsPanel";
import "./App.css";

const DOC_MIN_WIDTH = 280;
const FEED_MIN_WIDTH = 280;
const RESIZER_W = 6;

// Views
const VIEW_HOME = "home";
const VIEW_SESSION = "session";

function App() {
  const [view, setView] = useState(VIEW_HOME);          // home | session
  const [sessions, setSessions] = useState([]);         // populated in 3.2
  const [docWidth, setDocWidth] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const panelsRef = useRef(null);

  // Resizer drag
  const handleResizerDrag = useCallback((clientX) => {
    const container = panelsRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const maxDoc = rect.width - FEED_MIN_WIDTH - RESIZER_W;
    const newWidth = Math.min(maxDoc, Math.max(DOC_MIN_WIDTH, clientX - rect.left));
    setDocWidth(newWidth);
  }, []);

  // Start new session → go to session view
  const handleNewSession = useCallback(() => {
    // Story 3.2: will create session folder + meta
    console.log("[ArchNotary] New session started");
    setView(VIEW_SESSION);
    setIsRecording(false);
  }, []);

  // Open existing session
  const handleOpenSession = useCallback((id) => {
    console.log("[ArchNotary] Opening session:", id);
    setView(VIEW_SESSION);
  }, []);

  // Delete session
  const handleDeleteSession = useCallback((id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // New Document from within session view
  const handleNewDocument = useCallback(() => {
    // Story 3.2: save current session, create new
    console.log("[ArchNotary] New Document from session");
    setView(VIEW_HOME);
  }, []);

  // Back to home
  const handleBackToHome = useCallback(() => {
    setView(VIEW_HOME);
  }, []);

  // ── HOME VIEW ──────────────────────────────────────────────
  if (view === VIEW_HOME) {
    return (
      <div className="app">
        <SessionsBrowser
          sessions={sessions}
          onNew={handleNewSession}
          onOpen={handleOpenSession}
          onDelete={handleDeleteSession}
        />
        {showSettings && (
          <AgentSettingsPanel onClose={() => setShowSettings(false)} />
        )}
      </div>
    );
  }

  // ── SESSION VIEW ────────────────────────────────────────────
  return (
    <div className="app">
      <Header
        isRecording={isRecording}
        onVoiceToggle={() => setIsRecording((p) => !p)}
        onNewDocument={handleNewDocument}
        onSettings={() => setShowSettings(true)}
        onBack={handleBackToHome}
      />

      <div className="panels" ref={panelsRef}>

        {/* Left: Document */}
        <div
          className="panel-doc"
          style={docWidth ? { width: docWidth, flex: "none" } : {}}
        >
          <div className="panel-header">📄 Document</div>
          <div className="doc-body">
            <div className="doc-placeholder">
              <span className="doc-icon">📄</span>
              <p>המסמך יוצג כאן</p>
            </div>
          </div>
        </div>

        <Resizer onDrag={handleResizerDrag} />

        {/* Right: Feed */}
        <div className="panel-feed">
          <div className="panel-header">💬 Feed</div>
          <div className="feed-messages">
            <div className="feed-empty">
              <span className="feed-icon">🎤</span>
              <p>הפיד יופיע כאן</p>
            </div>
          </div>
        </div>

      </div>

      {showSettings && (
        <AgentSettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

export default App;
