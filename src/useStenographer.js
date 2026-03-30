/**
 * useStenographer — the stenographer agent loop.
 *
 * Timer: fires every ~20s when voice is active AND there are unprocessed entries.
 * Typed message: triggerNow() fires immediately + resets timer.
 *
 * On each cycle:
 * 1. Collect new feed entries since lastProcessed
 * 2. Build prompt: new entries + current document
 * 3. Call LLM → parse JSON: { doc_patches, agent_triggers }
 * 4. Apply doc_patches via onPatch()
 * 5. Fire agent_triggers via onTrigger()
 * 6. Append [processed] system line to feed
 * 7. Update lastProcessed
 */

import { useRef, useCallback, useEffect } from "react";
import { llmCall } from "./llmClient";

const CYCLE_MS = 20_000;

const STENO_SYSTEM = `You are a professional meeting stenographer.

You receive new feed entries (voice transcripts and typed messages) plus the current document state.
Respond ONLY with valid JSON — no markdown, no extra text:

{
  "doc_patches": [
    { "sectionKey": "string", "content": "markdown string", "action": "upsert" }
  ],
  "agent_triggers": [
    { "agentId": "string", "question": "string" }
  ]
}

Rules:
- doc_patches: update/create document sections based on what was discussed.
- agent_triggers: only when the conversation explicitly invites an expert (architect, coach, finance).
- Keep document concise. Use markdown headings and bullets.
- agentId must be one of: architect, coach, finance.
- If nothing new to add, return empty arrays.`;

function buildPrompt(newEntries, docState) {
  const feedText = newEntries
    .map((e) => `[${e.type === "voice" ? "🎤" : "✏️"} ${e.timestamp ?? ""}] ${e.text}`)
    .join("\n");

  const docText = (docState.order ?? [])
    .filter((k) => docState.sections?.[k])
    .map((k) => `## ${k}\n${docState.sections[k].content}`)
    .join("\n\n");

  return `New feed entries:\n${feedText}\n\nCurrent document:\n${docText || "(empty)"}`;
}

export function useStenographer({ provider, model, isActive, feedEntries, docState, onPatch, onTrigger, onSystemLine }) {
  const lastProcessedRef = useRef(0); // index into feedEntries processed so far
  const timerRef = useRef(null);
  const runningRef = useRef(false);

  const runCycle = useCallback(async () => {
    if (runningRef.current || !provider || !model) return;

    const newEntries = feedEntries.slice(lastProcessedRef.current).filter((e) => !e.isSystem && !e.isInterim);
    if (newEntries.length === 0) return;

    runningRef.current = true;
    try {
      const userMsg = buildPrompt(newEntries, docState);
      const { content } = await llmCall({
        provider,
        model,
        messages: [
          { role: "system", content: STENO_SYSTEM },
          { role: "user", content: userMsg },
        ],
      });

      let parsed;
      try { parsed = JSON.parse(content); }
      catch { parsed = { doc_patches: [], agent_triggers: [] }; }

      (parsed.doc_patches ?? []).forEach((p) => onPatch(p));
      (parsed.agent_triggers ?? []).forEach((t) => onTrigger(t));

      lastProcessedRef.current = feedEntries.length;
      onSystemLine("[processed]", null);
    } catch (err) {
      console.error("[Stenographer] error:", err.message);
      onSystemLine(`[error: ${err.message}]`, null);
    } finally {
      runningRef.current = false;
    }
  }, [provider, model, feedEntries, docState, onPatch, onTrigger, onSystemLine]);

  // Timer: runs every CYCLE_MS when isActive
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(runCycle, CYCLE_MS);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, runCycle]);

  // Immediate trigger (called by typed message handler)
  const triggerNow = useCallback(() => {
    clearInterval(timerRef.current);
    runCycle();
    if (isActive) {
      timerRef.current = setInterval(runCycle, CYCLE_MS);
    }
  }, [isActive, runCycle]);

  return { triggerNow };
}
