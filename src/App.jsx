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
import { useConfig } from "./useConfig";
import { useStenographer } from "./useStenographer";
import { useExpertAgent } from "./useExpertAgent";
import { Document, applyPatch } from "./Document";
import { downloadDocument } from "./exportDocument";
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
  const [docState, setDocState] = useState({ sections: {}, order: [] });
  const [isRtl, setIsRtl] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const panelsRef = useRef(null);
  const interimIdRef = useRef(null); // id of current interim entry

  const { init, createSession, appendFeedEntry, saveDocument, loadSession, loadAllSessions } = useSession();
  const { config, loadConfig } = useConfig();

  // Init storage + config on mount
  useEffect(() => {
    init().then(async () => {
      await loadConfig();
      const loaded = await loadAllSessions();
      setSessions(loaded);
    });
  }, [init, loadConfig, loadAllSessions]);

  // ── Feed entry helper (used by expert agent) ─────────────
  const addFeedEntry = useCallback((partial) => {
    const entry = { id: newId(), timestamp: timestamp(), ...partial };
    setFeedEntries((prev) => [...prev, entry]);
    if (!partial.isSystem) appendFeedEntry(entry);
    return entry;
  }, [appendFeedEntry]);

  // ── Expert Agents ─────────────────────────────────────────
  const expertAgentRef = useRef(null);
  const expertAgent = useExpertAgent({
    providers: config.providers,
    agents: config.agents,
    feedEntries,
    docState,
    onFeedEntry: addFeedEntry,
  });
  expertAgentRef.current = expertAgent;

  // ── Stenographer ──────────────────────────────────────────
  const stenoAgent = config.agents?.find((a) => a.id === "stenographer");
  const stenoProvider = config.providers?.find((p) => p.id === stenoAgent?.providerId);

  const { triggerNow } = useStenographer({
    // triggerNowRef synced below after hook returns
    provider: stenoProvider,
    model: stenoAgent?.model,
    isActive: isRecording,
    feedEntries,
    docState,
    onPatch: applyDocPatch,
    onTrigger: (trigger) => expertAgentRef.current?.invoke(trigger),
    onSystemLine: (label, tooltip) => {
      setFeedEntries((prev) => [
        ...prev,
        { id: newId(), isSystem: true, text: label, tooltip },
      ]);
    },
  });

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
  const triggerNowRef = useRef(null); // avoid circular dep with useStenographer
  const handleSend = useCallback((text) => {
    const entry = { id: newId(), type: "typed", text, timestamp: timestamp() };
    setFeedEntries((prev) => [...prev, entry]);
    appendFeedEntry(entry); // persist
    triggerNowRef.current?.(); // Story 6.3: immediate stenographer cycle
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
    const { entries, document } = await loadSession(id);
    setFeedEntries(entries);
    setDocState(document ?? { sections: {}, order: [] });
    setView(VIEW_SESSION);
  }, [loadSession]);

  // Exposed for Stenographer (Story 6.1) to apply patches
  const applyDocPatch = useCallback((patch) => {
    setDocState((prev) => {
      const next = applyPatch(prev, patch);
      saveDocument(next);
      return next;
    });
  }, [saveDocument]);

  const handleDeleteSession = useCallback((id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Sync triggerNow ref after stenographer hook resolves
  triggerNowRef.current = triggerNow;

  const handleNewDocument = useCallback(() => {
    stopStt();
    setIsRecording(false);
    setFeedEntries([]);
    setDocState({ sections: {}, order: [] });
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
            onDownload={(fmt) => downloadDocument(docState, fmt)}
          />
          <Document docState={docState} isRtl={isRtl} />
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
