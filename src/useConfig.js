/**
 * useConfig — predefined providers + agents config.
 *
 * Providers are fixed (Anthropic, Claude SDK, OpenAI, Google Gemini).
 * Only mutable data is persisted: apiKey, models, status, statusMsg, statusAt.
 *
 * On startup: checkAllProviders() auto-checks all that have a key (or SDK).
 * On saveApiKey(): immediately fetches models and updates status.
 */

import { useState, useCallback, useRef } from "react";
import { readFile, writeFile } from "./storage";

const CONFIG_PATH = "config.json";

// ── Predefined providers ──────────────────────────────────────────

export const PREDEFINED_PROVIDERS = [
  {
    id: "anthropic",
    name: "Anthropic",
    icon: "🔷",
    endpoint: "https://api.anthropic.com/v1",
    sdkOnly: false,
  },
  {
    id: "claude-sdk",
    name: "Claude Code SDK",
    icon: "🤖",
    endpoint: null,
    sdkOnly: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: "🟢",
    endpoint: "https://api.openai.com/v1",
    sdkOnly: false,
  },
  {
    id: "google",
    name: "Google Gemini",
    icon: "🔵",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
    sdkOnly: false,
  },
];

// Hardcoded Claude model list for SDK mode (no /models endpoint)
const CLAUDE_SDK_MODELS = [
  "claude-opus-4-5",
  "claude-sonnet-4-5",
  "claude-haiku-3-5",
];

// ── Default agents ────────────────────────────────────────────────

const DEFAULT_AGENTS = [
  {
    id: "stenographer",
    name: "Stenographer",
    icon: "✍️",
    locked: true,
    providerId: null,
    model: "",
    instructions:
      "You are a professional meeting stenographer. Summarize the feed into a structured document.",
    active: true,
  },
  {
    id: "architect",
    name: "The Architect",
    icon: "🏗️",
    locked: false,
    providerId: null,
    model: "",
    instructions:
      "You are a software architect. Answer technical questions from the meeting context.",
    active: true,
  },
  {
    id: "coach",
    name: "Coach",
    icon: "🎯",
    locked: false,
    providerId: null,
    model: "",
    instructions:
      "You are an agile coaching expert. Provide coaching insights from the meeting.",
    active: false,
  },
  {
    id: "finance",
    name: "Finance",
    icon: "💰",
    locked: false,
    providerId: null,
    model: "",
    instructions:
      "You are a financial analyst. Provide financial insights when relevant.",
    active: false,
  },
];

// ── Helpers ───────────────────────────────────────────────────────

function mergeProviders(persisted) {
  return PREDEFINED_PROVIDERS.map((p) => ({
    ...p,
    apiKey: p.sdkOnly ? null : (persisted?.[p.id]?.apiKey ?? ""),
    models: persisted?.[p.id]?.models ?? [],
    status: persisted?.[p.id]?.status ?? null,   // null | "ok" | "error"
    statusMsg: persisted?.[p.id]?.statusMsg ?? "",
    statusAt: persisted?.[p.id]?.statusAt ?? null,
  }));
}

function providersToConfig(providers) {
  const out = {};
  for (const p of providers) {
    out[p.id] = {
      ...(p.sdkOnly ? {} : { apiKey: p.apiKey ?? "" }),
      models: p.models ?? [],
      status: p.status ?? null,
      statusMsg: p.statusMsg ?? "",
      statusAt: p.statusAt ?? null,
    };
  }
  return out;
}

// ── Provider check (pure async — no React state) ──────────────────

async function performProviderCheck(provider) {
  const statusAt = new Date().toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ── Claude Code SDK: detect CLI + read API key from environment ──
  if (provider.sdkOnly) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const exists = await invoke("check_claude_sdk");
      if (!exists) {
        return { status: "error", statusMsg: "claude CLI not found in PATH", models: [], statusAt };
      }
      // Read ANTHROPIC_API_KEY from environment — Claude Code sets this
      const envKey = await invoke("get_env_anthropic_key");
      if (!envKey) {
        return {
          status: "error",
          statusMsg: "claude CLI found but ANTHROPIC_API_KEY not set in environment",
          models: [],
          statusAt,
        };
      }
      // Return endpoint + key so LLM calls work transparently via Anthropic API
      // Note: apiKey is NOT persisted to disk (re-read from env on each startup)
      return {
        status: "ok",
        statusMsg: "",
        models: CLAUDE_SDK_MODELS,
        statusAt,
        endpoint: "https://api.anthropic.com/v1",
        apiKey: envKey,
      };
    } catch {
      return { status: "error", statusMsg: "Tauri not available", models: [], statusAt };
    }
  }

  // ── API provider: fetch /models ─────────────────────────────────
  if (!provider.apiKey) return null; // no key — skip

  try {
    const res = await fetch(`${provider.endpoint}/models`, {
      headers: { Authorization: `Bearer ${provider.apiKey}` },
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const models = (data.data ?? [])
      .map((m) => m.id)
      .filter(Boolean)
      .sort();
    return { status: "ok", statusMsg: "", models, statusAt };
  } catch (err) {
    return { status: "error", statusMsg: err.message, models: [], statusAt };
  }
}

// ── Hook ──────────────────────────────────────────────────────────

export function useConfig() {
  const [providers, setProviders] = useState(() => mergeProviders({}));
  const [agents, setAgents] = useState(DEFAULT_AGENTS);

  // Refs mirror latest state — avoid stale closures in async callbacks
  const providersRef = useRef(providers);
  const agentsRef = useRef(agents);
  providersRef.current = providers;
  agentsRef.current = agents;

  // ── Persist ───────────────────────────────────────────────────
  const persist = useCallback(async (ps, ags) => {
    await writeFile(
      CONFIG_PATH,
      JSON.stringify({ providers: providersToConfig(ps), agents: ags }, null, 2)
    );
  }, []);

  // Update providers state + persist
  const updateProviders = useCallback(
    (updater) => {
      setProviders((prev) => {
        const next = updater(prev);
        persist(next, agentsRef.current);
        return next;
      });
    },
    [persist]
  );

  // Update agents state + persist
  const updateAgents = useCallback(
    (updater) => {
      setAgents((prev) => {
        const next = updater(prev);
        persist(providersRef.current, next);
        return next;
      });
    },
    [persist]
  );

  // ── Load ──────────────────────────────────────────────────────

  // Try to read API keys from environment (available when launched from Claude Code terminal).
  // Only fills in keys that aren't already persisted — never overwrites user-set keys.
  const applyEnvKeys = useCallback(async (providers) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const envKeys = await invoke("get_env_api_keys"); // { anthropic: "sk-...", openai: "sk-...", ... }
      if (!envKeys || !Object.keys(envKeys).length) return providers;

      const updated = providers.map((p) => {
        if (p.sdkOnly) return p; // SDK handled separately via check_claude_sdk
        const envKey = envKeys[p.id];
        if (envKey && !p.apiKey) {
          console.log(`[Config] auto-populated key for ${p.id} from environment`);
          return { ...p, apiKey: envKey };
        }
        return p;
      });
      return updated;
    } catch {
      return providers; // not in Tauri context — ignore
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const raw = await readFile(CONFIG_PATH);
      if (raw) {
        const data = JSON.parse(raw);
        let merged = mergeProviders(data.providers ?? {});
        // Auto-fill missing keys from environment (Claude Code terminal sets them)
        merged = await applyEnvKeys(merged);
        const mergedAgents = DEFAULT_AGENTS.map((def) => ({
          ...def,
          ...(data.agents?.find((a) => a.id === def.id) ?? {}),
        }));
        setProviders(merged);
        setAgents(mergedAgents);
        // Sync refs immediately so checkAllProviders can use them
        providersRef.current = merged;
        agentsRef.current = mergedAgents;
        return merged; // return for immediate use
      }
    } catch {
      /* keep defaults */
    }
    return providersRef.current;
  }, [applyEnvKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Check single provider ─────────────────────────────────────
  // Accepts: provider object (for immediate check after key change) OR id string
  const checkProvider = useCallback(
    async (providerOrId) => {
      const id =
        typeof providerOrId === "string" ? providerOrId : providerOrId.id;
      const p =
        typeof providerOrId === "object" && "endpoint" in providerOrId
          ? providerOrId // use passed object (has fresh apiKey)
          : providersRef.current.find((pp) => pp.id === id);
      if (!p) return;

      const result = await performProviderCheck(p);
      if (!result) return;

      updateProviders((prev) =>
        prev.map((pp) => (pp.id === id ? { ...pp, ...result } : pp))
      );
    },
    [updateProviders]
  );

  // ── Check all providers (called on startup) ───────────────────
  const checkAllProviders = useCallback(
    async (list) => {
      const toCheck = list ?? providersRef.current;
      for (const p of toCheck) {
        if (p.sdkOnly || p.apiKey) {
          const result = await performProviderCheck(p);
          if (!result) continue;
          updateProviders((prev) =>
            prev.map((pp) => (pp.id === p.id ? { ...pp, ...result } : pp))
          );
        }
      }
    },
    [updateProviders]
  );

  // ── Save API key + immediately check ─────────────────────────
  const saveApiKey = useCallback(
    async (id, apiKey) => {
      // Capture the updated provider before async gap
      let providerWithKey = null;
      updateProviders((prev) => {
        const next = prev.map((p) => {
          if (p.id === id) {
            providerWithKey = { ...p, apiKey };
            return providerWithKey;
          }
          return p;
        });
        return next;
      });

      if (!providerWithKey) return;
      const result = await performProviderCheck(providerWithKey);
      if (!result) return;
      updateProviders((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...result } : p))
      );
    },
    [updateProviders]
  );

  // ── Update agent ──────────────────────────────────────────────
  const updateAgent = useCallback(
    (agent) => {
      updateAgents((prev) => prev.map((a) => (a.id === agent.id ? agent : a)));
    },
    [updateAgents]
  );

  return {
    providers,
    agents,
    loadConfig,
    checkProvider,
    checkAllProviders,
    saveApiKey,
    updateAgent,
  };
}
