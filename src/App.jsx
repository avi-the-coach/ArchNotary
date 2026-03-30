import "./App.css";

function App() {
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
      <div className="panels">

        {/* Left: Document */}
        <div className="panel-doc">
          <div className="panel-header">📄 Document</div>
          <div className="doc-body">
            <div className="doc-placeholder">
              <span className="doc-icon">📄</span>
              <p>המסמך יוצג כאן</p>
            </div>
          </div>
        </div>

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
