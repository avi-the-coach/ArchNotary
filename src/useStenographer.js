/**
 * useStenographer — the stenographer agent loop.
 *
 * Timer: fires every ~20s when voice is active AND there are unprocessed entries.
 * Typed message: triggerNow() fires immediately + resets timer.
 *
 * KEY DESIGN: feedEntries and docState are accessed via REFS (not closure deps).
 * This prevents runCycle from changing on every new entry, which would
 * continuously reset the 20s timer and prevent it from ever firing.
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

export function useStenographer({
  provider,
  model,
  isActive,
  feedEntries,
  docState,
  onPatch,
  onTrigger,
  onSystemLine,
}) {
  const lastProcessedRef = useRef(0);
  const timerRef         = useRef(null);
  const runningRef       = useRef(false);

  // ── Refs for latest values — avoids stale closures + prevents timer reset ──
  // runCycle reads from these instead of closing over the prop values.
  // This means feedEntries/docState are NOT deps of runCycle's useCallback,
  // so the timer doesn't restart every time new entries arrive.
  const feedEntriesRef = useRef(feedEntries);
  const docStateRef    = useRef(docState);
  feedEntriesRef.current = feedEntries;
  docStateRef.current    = docState;

  const runCycle = useCallback(async () => {
    if (runningRef.current) return;

    // ── Guard: provider not configured ────────────────────────
    if (!provider || !model) {
      console.log("[Steno] skipped — no provider/model:", { provider: provider?.id, model });
      onSystemLine(
        "✍️ waiting for provider — open ⚙️ Settings → Agents",
        "Stenographer needs a Provider and Model configured"
      );
      return;
    }

    // ── Guard: nothing new to process ─────────────────────────
    const allEntries = feedEntriesRef.current;
    const newEntries = allEntries
      .slice(lastProcessedRef.current)
      .filter((e) => !e.isSystem && !e.isInterim);

    if (newEntries.length === 0) {
      console.log("[Steno] skipped — no new entries");
      return;
    }

    // ── Run cycle ─────────────────────────────────────────────
    runningRef.current = true;
    console.log(`[Steno] ▶ cycle start — ${newEntries.length} new entries, provider=${provider.id}, model=${model}`);

    try {
      const userMsg = buildPrompt(newEntries, docStateRef.current);
      console.log("[Steno] calling LLM...");

      const { content } = await llmCall({
        provider,
        model,
        messages: [
          { role: "system", content: STENO_SYSTEM },
          { role: "user", content: userMsg },
        ],
      });

      console.log("[Steno] raw response:", content.slice(0, 300));

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        console.warn("[Steno] JSON parse failed:", e.message, "| content:", content.slice(0, 200));
        parsed = { doc_patches: [], agent_triggers: [] };
      }

      const patches  = parsed.doc_patches    ?? [];
      const triggers = parsed.agent_triggers ?? [];

      console.log(`[Steno] ✓ patches=${patches.length} triggers=${triggers.length}`);

      patches.forEach((p)  => onPatch(p));
      triggers.forEach((t) => onTrigger(t));

      // Advance the processed index AFTER applying patches (use ref for latest length)
      lastProcessedRef.current = feedEntriesRef.current.length;

      // ── System line: summary ──────────────────────────────
      if (patches.length > 0) {
        const sections = patches.map((p) => p.sectionKey).join(", ");
        onSystemLine(
          `✍️ updated: ${sections}`,
          JSON.stringify(parsed, null, 2)
        );
      } else if (triggers.length > 0) {
        onSystemLine(`✍️ processed — triggered ${triggers.length} agent(s)`, JSON.stringify(triggers, null, 2));
      } else {
        onSystemLine("✍️ processed — no changes", null);
      }

    } catch (err) {
      console.error("[Stenographer] error:", err);
      onSystemLine(`✍️ error: ${err.message}`, err.stack ?? err.message);
    } finally {
      runningRef.current = false;
    }
  // NOTE: feedEntries and docState intentionally NOT in deps — accessed via refs.
  }, [provider, model, onPatch, onTrigger, onSystemLine]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer: starts/stops with voice ────────────────────────────
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(runCycle, CYCLE_MS);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, runCycle]);

  // ── Immediate trigger (typed message or manual) ───────────────
  const triggerNow = useCallback(() => {
    clearInterval(timerRef.current);
    runCycle();
    if (isActive) {
      timerRef.current = setInterval(runCycle, CYCLE_MS);
    }
  }, [isActive, runCycle]);

  return { triggerNow };
}
