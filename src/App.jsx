import { useState, useRef, useCallback, useEffect } from "react";
import { Header } from "./Header";
import { Resizer } from "./Resizer";
import { SessionsBrowser } from "./SessionsBrowser";
import { DocumentToolbar } from "./DocumentToolbar";
import { Feed } from "./Feed";
import { FeedInput } from "./FeedInput";
import { AgentSettingsPanel } from "./AgentSettingsPanel";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { useSession } from "./useSession";
import "./App.css";

const DOC_MIN_WIDTH = 280;
const FEED_MIN_WIDTH = 280;
const RESIZER_W = 6;

const VIEW_HOME = "home";
const VIEW_SESSION = "session";

let entryId = 0;
function newId() { return ++entryId; }

function timestamp() {
  return new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function App() {
  const [view, setView] = useState(VIEW_HOME);
  const [sessions, setSessions] = useState([]);
  const [feedEntries, setFeedEntries] = useState([]);
  const [docWidth, setDocWidth] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isRtl, setIsRtl] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const panelsRef = useRef(null);
  const interimIdRef = useRef(null); // id of current interim entry

  const { init, createSession, appendFeedEntry, loadSession, loadAllSessions } = useSession();

  // Init storage + load sessions on mount
  useEffect(() => {
    init().then(async () => {
      const loaded = await loadAllSessions();
      setSessions(loaded);
    });
  }, [init, loadAllSessions]);

  // ── Speech callbacks ──────────────────────────────────────
  const onInterim = useCallback((text) => {
    setFeedEntries((prev) => {
      if (interimIdRef.current !== null) {
        // update existing interim entry
        return prev.map((e) =>
          e.id === interimIdRef.current ? { ...e, text } : e
        );
      }
      const id = newId();
      interimIdRef.current = id;
      return [
        ...prev,
        { id, type: "voice", text, timestamp: timestamp(), isInterim: true },
      ];
    });
  }, []);

  const onFinal = useCallback((text) => {
    const entry = { id: newId(), type: "voice", text, timestamp: timestamp(), isInterim: false };
    setFeedEntries((prev) => {
      if (interimIdRef.current !== null) {
        const updated = prev.map((e) =>
          e.id === interimIdRef.current ? { ...entry, id: e.id } : e
        );
        interimIdRef.current = null;
        return updated;
      }
      return [...prev, entry];
    });
    appendFeedEntry(entry); // persist
  }, [appendFeedEntry]);

  const onSttError = useCallback((err) => {
    console.warn("[ArchNotary] STT error:", err);
  }, []);

  const { start: startStt, stop: stopStt, isSupported: sttSupported } =
    useSpeechRecognition({ onInterim, onFinal, onError: onSttError });

  // ── Voice toggle ──────────────────────────────────────────
  const handleVoiceToggle = useCallback(() => {
    setIsRecording((prev) => {
      if (prev) { stopStt(); return false; }
      startStt(); return true;
    });
  }, [startStt, stopStt]);

  // Stop STT when leaving session view
  useEffect(() => {
    if (view !== VIEW_SESSION && isRecording) {
      stopStt();
      setIsRecording(false);
    }
  }, [view, isRecording, stopStt]);

  // ── Typed message ─────────────────────────────────────────
  const handleSend = useCallback((text) => {
    const entry = { id: newId(), type: "typed", text, timestamp: timestamp() };
    setFeedEntries((prev) => [...prev, entry]);
    appendFeedEntry(entry); // persist
    // Story 6.3: trigger stenographer immediately here
  }, [appendFeedEntry]);

  // ── Resizer ───────────────────────────────────────────────
  const handleResizerDrag = useCallback((clientX) => {
    const container = panelsRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const maxDoc = rect.width - FEED_MIN_WIDTH - RESIZER_W;
    setDocWidth(Math.min(maxDoc, Math.max(DOC_MIN_WIDTH, clientX - rect.left)));
  }, []);

  // ── Navigation ────────────────────────────────────────────
  const handleNewSession = useCallback(async () => {
    await createSession();
    setFeedEntries([]);
    setView(VIEW_SESSION);
    setIsRecording(false);
  }, [createSession]);

  const handleOpenSession = useCallback(async (id) => {
    const { entries } = await loadSession(id);
    setFeedEntries(entries);
    setView(VIEW_SESSION);
  }, [loadSession]);

  const handleDeleteSession = useCallback((id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleNewDocument = useCallback(() => {
    stopStt();
    setIsRecording(false);
    setFeedEntries([]);
    setView(VIEW_HOME);
  }, [stopStt]);

  // ── HOME VIEW ─────────────────────────────────────────────
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

  // ── SESSION VIEW ──────────────────────────────────────────
  return (
    <div className="app">
      <Header
        isRecording={isRecording}
        onVoiceToggle={handleVoiceToggle}
        onNewDocument={handleNewDocument}
        onSettings={() => setShowSettings(true)}
        onBack={handleNewDocument}
      />

      <div className="panels" ref={panelsRef}>

        {/* Document panel */}
        <div
          className="panel-doc"
          style={docWidth ? { width: docWidth, flex: "none" } : {}}
        >
          <div className="panel-header">📄 Document</div>
          <DocumentToolbar
            isRtl={isRtl}
            onRtlToggle={() => setIsRtl((p) => !p)}
            onDownload={(fmt) => console.log("[ArchNotary] Download:", fmt)}
          />
          <div className="doc-body" dir={isRtl ? "rtl" : "ltr"}>
            <div className="doc-placeholder">
              <span className="doc-icon">📄</span>
              <p>המסמך יוצג כאן</p>
            </div>
          </div>
        </div>

        <Resizer onDrag={handleResizerDrag} />

        {/* Feed panel */}
        <div className="panel-feed">
          <div className="panel-header">💬 Feed</div>
          <Feed entries={feedEntries} />
          <FeedInput onSend={handleSend} />
        </div>

      </div>

      {showSettings && (
        <AgentSettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

export default App;
