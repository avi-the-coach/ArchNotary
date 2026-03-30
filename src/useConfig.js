/**
 * useConfig — loads/saves config.json (providers + agents).
 * config.json lives at: AppData/archnotary/config.json
 */

import { useState, useCallback } from "react";
import { readFile, writeFile } from "./storage";

const CONFIG_PATH = "config.json";

const DEFAULT_CONFIG = {
  providers: [],
  agents: [
    {
      id: "stenographer",
      name: "Stenographer",
      icon: "✍️",
      locked: true,
      providerId: null,
      model: "",
      instructions: "You are a professional meeting stenographer. Summarize the feed into a structured document.",
      active: true,
    },
    {
      id: "architect",
      name: "The Architect",
      icon: "🏗️",
      locked: false,
      providerId: null,
      model: "",
      instructions: "You are a software architect. Answer technical questions from the meeting context.",
      active: true,
    },
    {
      id: "coach",
      name: "Coach",
      icon: "🎯",
      locked: false,
      providerId: null,
      model: "",
      instructions: "You are an agile coaching expert. Provide coaching insights from the meeting.",
      active: false,
    },
    {
      id: "finance",
      name: "Finance",
      icon: "💰",
      locked: false,
      providerId: null,
      model: "",
      instructions: "You are a financial analyst. Provide financial insights when relevant.",
      active: false,
    },
  ],
};

export function useConfig() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const raw = await readFile(CONFIG_PATH);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge: ensure default agents exist
        const mergedAgents = DEFAULT_CONFIG.agents.map((def) => ({
          ...def,
          ...(parsed.agents?.find((a) => a.id === def.id) ?? {}),
        }));
        setConfig({ ...parsed, agents: mergedAgents });
      }
    } catch { /* keep defaults */ }
    setLoaded(true);
  }, []);

  const saveConfig = useCallback(async (newConfig) => {
    setConfig(newConfig);
    await writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
  }, []);

  const updateProvider = useCallback(async (provider) => {
    setConfig((prev) => {
      const providers = prev.providers.some((p) => p.id === provider.id)
        ? prev.providers.map((p) => (p.id === provider.id ? provider : p))
        : [...prev.providers, provider];
      const next = { ...prev, providers };
      writeFile(CONFIG_PATH, JSON.stringify(next, null, 2));
      return next;
    });
  }, []);

  const deleteProvider = useCallback(async (providerId) => {
    setConfig((prev) => {
      const providers = prev.providers.filter((p) => p.id !== providerId);
      // Mark agents that used this provider as orphaned
      const agents = prev.agents.map((a) =>
        a.providerId === providerId ? { ...a, providerId: null } : a
      );
      const next = { ...prev, providers, agents };
      writeFile(CONFIG_PATH, JSON.stringify(next, null, 2));
      return next;
    });
  }, []);

  const updateAgent = useCallback(async (agent) => {
    setConfig((prev) => {
      const agents = prev.agents.map((a) => (a.id === agent.id ? agent : a));
      const next = { ...prev, agents };
      writeFile(CONFIG_PATH, JSON.stringify(next, null, 2));
      return next;
    });
  }, []);

  return { config, loaded, loadConfig, saveConfig, updateProvider, deleteProvider, updateAgent };
}
