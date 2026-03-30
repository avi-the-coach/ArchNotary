import { useState, useCallback } from "react";
import "./FeedInput.css";

/**
 * FeedInput — typed message input at bottom of Feed panel.
 * Props:
 *   onSend {fn(text)} — called with trimmed message text
 */
export function FeedInput({ onSend }) {
  const [text, setText] = useState("");

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend?.(trimmed);
    setText("");
  }, [text, onSend]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="feed-input-area">
      <div className="feed-input-row">
        <textarea
          className="feed-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="הקלד הודעה… (Enter לשליחה)"
          rows={1}
          dir="auto"
        />
        <button
          className="feed-send-btn"
          onClick={handleSend}
          disabled={!text.trim()}
          title="Send"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
