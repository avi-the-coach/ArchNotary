/**
 * llmClient.js — OpenAI-compatible chat completion.
 * Works with Anthropic (via OpenAI compat endpoint), OpenAI, and compatible providers.
 *
 * tool use: pass tools array; loop until stop_reason = "stop" / "end_turn"
 */

/**
 * Single LLM call (no tool loop).
 * Returns { content: string, tool_calls: [] }
 */
export async function llmCall({ provider, model, messages, tools, temperature = 0.4 }) {
  const body = {
    model,
    messages,
    temperature,
    max_tokens: 4096,
    ...(tools?.length ? { tools } : {}),
  };

  const res = await fetch(`${provider.endpoint}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content ?? "",
    tool_calls: choice?.message?.tool_calls ?? [],
    finish_reason: choice?.finish_reason ?? "stop",
  };
}

/**
 * Agent loop with tool use.
 * executeTool(name, args) → string result
 */
export async function agentLoop({ provider, model, messages, tools, executeTool, maxRounds = 8 }) {
  const msgs = [...messages];
  let rounds = 0;

  while (rounds++ < maxRounds) {
    const { content, tool_calls, finish_reason } = await llmCall({ provider, model, messages: msgs, tools });

    if (tool_calls?.length) {
      // Add assistant message with tool_calls
      msgs.push({ role: "assistant", content, tool_calls });

      // Execute each tool call
      for (const tc of tool_calls) {
        const args = JSON.parse(tc.function.arguments ?? "{}");
        const result = await executeTool(tc.function.name, args);
        msgs.push({
          role: "tool",
          tool_call_id: tc.id,
          content: String(result),
        });
      }
      continue;
    }

    return content; // end_turn / stop
  }
  throw new Error("agentLoop: max rounds exceeded");
}
