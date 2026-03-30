/**
 * useExpertAgent — handles expert agent invocation + web search tool use.
 *
 * Story 7.1: invoke agent → 🧠 entry in feed
 * Story 7.2: web search tool loop when provider supports tool_use
 */

import { useCallback } from "react";
import { agentLoop } from "./llmClient";

const WEB_SEARCH_TOOL = {
  type: "function",
  function: {
    name: "web_search",
    description: "Search the web for current information.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
};

/**
 * Execute web search via DuckDuckGo instant answers API (no key needed).
 * Falls back gracefully if unavailable.
 */
async function executeWebSearch(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
    const res = await fetch(url);
    const data = await res.json();
    const answer = data.AbstractText || data.Answer || "No result found.";
    return answer;
  } catch {
    return "Web search unavailable.";
  }
}

export function useExpertAgent({ providers, agents, feedEntries, docState, onFeedEntry }) {
  const invoke = useCallback(async (trigger) => {
    const agent = agents?.find((a) => a.id === trigger.agentId && a.active);
    if (!agent) return;

    const provider = providers?.find((p) => p.id === agent.providerId);
    if (!provider) return;

    const model = agent.model;
    const fullFeed = feedEntries
      .filter((e) => !e.isSystem && !e.isInterim)
      .map((e) => `[${e.type} ${e.timestamp ?? ""}] ${e.text}`)
      .join("\n");

    const docText = (docState.order ?? [])
      .filter((k) => docState.sections?.[k])
      .map((k) => `## ${k}\n${docState.sections[k].content}`)
      .join("\n\n");

    const messages = [
      { role: "system", content: agent.instructions },
      {
        role: "user",
        content: `Context (meeting feed):\n${fullFeed}\n\nDocument so far:\n${docText || "(empty)"}\n\nQuestion: ${trigger.question}`,
      },
    ];

    try {
      const answer = await agentLoop({
        provider,
        model,
        messages,
        tools: [WEB_SEARCH_TOOL],
        executeTool: async (name, args) => {
          if (name === "web_search") return executeWebSearch(args.query);
          return "Unknown tool";
        },
      });

      onFeedEntry({
        type: "agent",
        text: answer,
        agentName: `${agent.icon} ${agent.name}`,
      });
    } catch (err) {
      console.error(`[ExpertAgent:${agent.id}] error:`, err.message);
      onFeedEntry({
        type: "agent",
        text: `Error: ${err.message}`,
        agentName: `${agent.icon} ${agent.name}`,
      });
    }
  }, [providers, agents, feedEntries, docState, onFeedEntry]);

  return { invoke };
}
