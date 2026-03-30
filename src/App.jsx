import { useState, useRef, useCallback } from "react";
import { Header } from "./Header";
import { Resizer } from "./Resizer";
import { AgentSettingsPanel } from "./AgentSettingsPanel";
import "./App.css";

const DOC_MIN_WIDTH = 280;
const FEED_MIN_WIDTH = 280;
const RESIZER_W = 6;

function App() {
  const [docWidth, setDocWidth] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const panelsRef = useRef(null);

  const handleResizerDrag = useCallback((clientX) => {
    const container = panelsRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const maxDoc = rect.width - FEED_MIN_WIDTH - RESIZER_W;
    const newWidth = Math.min(maxDoc, Math.max(DOC_MIN_WIDTH, clientX - rect.left));
    setDocWidth(newWidth);
  }, []);

  const handleVoiceToggle = useCallback(() => {
    setIsRecording((prev) => !prev);
  }, []);

  const handleNewDocument = useCallback(() => {
    // Story 3.2: session lifecycle — placeholder
    console.log("[ArchNotary] New Document requested");
  }, []);

  return (
    <div className="app">
      <Header
        isRecording={isRecording}
        onVoiceToggle={handleVoiceToggle}
        onNewDocument={handleNewDocument}
        onSettings={() => setShowSettings(true)}
      />

      {/* Two panels */}
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

        {/* Resizer */}
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

      {/* Agent Settings Panel */}
      {showSettings && (
        <AgentSettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

export default App;
