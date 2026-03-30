/**
 * useSession — manages the active session lifecycle.
 *
 * Session folder: sessions/YYYY-MM-DD_HH-mm-ss/
 *   ├── meta.json        { id, name, createdAt, updatedAt }
 *   ├── feed.jsonl       one entry per line
 *   └── document.json    section map
 */

import { useRef, useCallback } from "react";
import {
  initStorage,
  writeFile,
  appendJsonl,
  readFile,
  loadAllSessions,
  sessionPath,
  writeSessionMeta,
} from "./storage";

function makeSessionId() {
  const now = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  );
}

export function useSession() {
  const sessionIdRef = useRef(null);

  /** Initialize app storage (call once on mount). */
  const init = useCallback(async () => {
    await initStorage();
  }, []);

  /** Create a new session, returns sessionId. */
  const createSession = useCallback(async (name = "") => {
    const id = makeSessionId();
    sessionIdRef.current = id;
    const meta = {
      id,
      name: name || `Session ${id.slice(0, 10)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await writeSessionMeta(id, meta);
    // init empty document
    await writeFile(sessionPath(id, "document.json"), JSON.stringify({ sections: {}, order: [] }, null, 2));
    return id;
  }, []);

  /** Append a feed entry to feed.jsonl. */
  const appendFeedEntry = useCallback(async (entry) => {
    const id = sessionIdRef.current;
    if (!id) return;
    await appendJsonl(sessionPath(id, "feed.jsonl"), entry);
  }, []);

  /** Save the full document state. */
  const saveDocument = useCallback(async (docState) => {
    const id = sessionIdRef.current;
    if (!id) return;
    await writeFile(sessionPath(id, "document.json"), JSON.stringify(docState, null, 2));
    // update updatedAt in meta
    const raw = await readFile(sessionPath(id, "meta.json"));
    if (raw) {
      try {
        const meta = JSON.parse(raw);
        meta.updatedAt = new Date().toISOString();
        await writeSessionMeta(id, meta);
      } catch { /* ignore */ }
    }
  }, []);

  /** Load a session from disk. Returns { entries, document }. */
  const loadSession = useCallback(async (id) => {
    sessionIdRef.current = id;
    const feedRaw = await readFile(sessionPath(id, "feed.jsonl"));
    const entries = feedRaw
      ? feedRaw.trim().split("\n").filter(Boolean).map((line) => {
          try { return JSON.parse(line); } catch { return null; }
        }).filter(Boolean)
      : [];

    const docRaw = await readFile(sessionPath(id, "document.json"));
    const document = docRaw ? JSON.parse(docRaw) : { sections: {}, order: [] };
    return { entries, document };
  }, []);

  return { init, createSession, appendFeedEntry, saveDocument, loadSession, loadAllSessions };
}
