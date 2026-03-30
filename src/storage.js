/**
 * storage.js — wraps Tauri file-system commands.
 *
 * In browser dev mode (no Tauri), falls back to localStorage stubs
 * so Vite preview still works.
 */

const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

async function invoke(cmd, args = {}) {
  if (!isTauri) {
    console.warn("[storage] Tauri not available — stub for:", cmd, args);
    return null;
  }
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke(cmd, args);
}

// ── Public API ───────────────────────────────────────────────

/** Initialize storage directories + config.json on first run. */
export async function initStorage() {
  return invoke("init_storage");
}

/** Read file content (empty string if not found). */
export async function readFile(relPath) {
  return invoke("read_file", { relPath }) ?? "";
}

/** Write (overwrite) file. */
export async function writeFile(relPath, content) {
  return invoke("write_file", { relPath, content });
}

/** Append a JSONL line to a file. */
export async function appendJsonl(relPath, obj) {
  const line = JSON.stringify(obj);
  return invoke("append_file", { relPath, line });
}

/** List session folder names, newest first. */
export async function listSessions() {
  return invoke("list_sessions") ?? [];
}

// ── Session helpers ──────────────────────────────────────────

/** Build the relative path for a session's file. */
export function sessionPath(sessionId, filename) {
  return `sessions/${sessionId}/${filename}`;
}

/** Read a session's meta.json. Returns null if not found. */
export async function readSessionMeta(sessionId) {
  const raw = await readFile(sessionPath(sessionId, "meta.json"));
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

/** Write / update a session's meta.json. */
export async function writeSessionMeta(sessionId, meta) {
  return writeFile(sessionPath(sessionId, "meta.json"), JSON.stringify(meta, null, 2));
}

/** Read full sessions list with metadata. */
export async function loadAllSessions() {
  const ids = await listSessions();
  const metas = await Promise.all(ids.map((id) => readSessionMeta(id)));
  return ids.map((id, i) => ({
    id,
    ...(metas[i] ?? { name: id, date: id.slice(0, 10) }),
  }));
}
