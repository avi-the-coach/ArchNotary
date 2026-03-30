import { useState, useRef, useCallback } from "react";
import { Resizer } from "./Resizer";
import "./App.css";

const DOC_MIN_WIDTH = 280;
const FEED_MIN_WIDTH = 280;
const RESIZER_W = 6;

function App() {
  const [docWidth, setDocWidth] = useState(null); // null = flex default
  const panelsRef = useRef(null);
  const docRef = useRef(null);

  // Receive absolute clientX; compute new doc width from container bounds
  const handleResizerDrag = useCallback((clientX) => {
    const container = panelsRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const maxDoc = rect.width - FEED_MIN_WIDTH - RESIZER_W;
    const newWidth = Math.min(maxDoc, Math.max(DOC_MIN_WIDTH, clientX - rect.left));
    setDocWidth(newWidth);
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="logo">🎙️</div>
        <div>
          <div className="app-name">The Notary</div>
          <div className="app-sub">Remember what matters.</div>
        </div>
        <div className="header-spacer" />
        <button className="start-btn">▶ Start Session</button>
      </header>

      {/* Two panels */}
      <div className="panels" ref={panelsRef}>

        {/* Left: Document */}
        <div
          className="panel-doc"
          ref={docRef}
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
    </div>
  );
}

export default App;
