import { useEffect, useRef, useState } from "react";
import "./Feed.css";

/* ─── Entry types ─────────────────────────────────────────── */
const ICONS = {
  voice: "🎤",
  typed: "✏️",
  agent: "🧠",
};

/**
 * FeedEntry — one transcript / typed / agent response entry.
 * Props: type ("voice"|"typed"|"agent"), text, timestamp, agentName, isInterim
 */
function FeedEntry({ type, text, timestamp, agentName, isInterim }) {
  return (
    <div className={`feed-entry feed-entry--${type} ${isInterim ? "interim" : ""}`}>
      <div className="entry-meta">
        <span className="entry-icon">{ICONS[type] ?? "💬"}</span>
        {agentName && <span className="entry-agent">{agentName}</span>}
        {timestamp && <span className="entry-time">{timestamp}</span>}
      </div>
      <div className="entry-text">{text}</div>
    </div>
  );
}

/**
 * SystemLine — separator with optional hover tooltip.
 * Props: label, tooltip (optional)
 */
function SystemLine({ label, tooltip }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="system-line"
      onMouseEnter={() => tooltip && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="system-line-text">┄┄┄ {label} ┄┄┄</span>
      {hovered && tooltip && (
        <div className="system-line-tooltip">{tooltip}</div>
      )}
    </div>
  );
}

/**
 * Feed — the right panel listing all entries + system lines.
 * Props:
 *   entries  {Array}  — feed items: { id, type, text, timestamp, agentName, isInterim, isSystem, tooltip }
 */
export function Feed({ entries = [] }) {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div className="feed-messages">
      {entries.length === 0 ? (
        <div className="feed-empty">
          <span className="feed-icon">🎤</span>
          <p>הפיד יופיע כאן</p>
        </div>
      ) : (
        entries.map((e) =>
          e.isSystem ? (
            <SystemLine key={e.id} label={e.text} tooltip={e.tooltip} />
          ) : (
            <FeedEntry
              key={e.id}
              type={e.type}
              text={e.text}
              timestamp={e.timestamp}
              agentName={e.agentName}
              isInterim={e.isInterim}
            />
          )
        )
      )}
      <div ref={bottomRef} />
    </div>
  );
}
