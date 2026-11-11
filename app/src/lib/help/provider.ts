export type HelpProviderName = "openai" | "anthropic" | "keyword";

export type ProviderEnv = {
  HELP_PROVIDER?: string;
  HELP_MODEL?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
};

export function selectHelpProvider(env: ProviderEnv): HelpProviderName {
  const asked = (env.HELP_PROVIDER || "").trim().toLowerCase();
  const openai = Boolean(env.OPENAI_API_KEY?.trim());
  const anthropic = Boolean(env.ANTHROPIC_API_KEY?.trim());
  if (asked === "keyword") return "keyword";
  if (asked === "openai") return openai ? "openai" : "keyword";
  if (asked === "anthropic") return anthropic ? "anthropic" : "keyword";
  if (anthropic) return "anthropic";
  if (openai) return "openai";
  return "keyword";
}

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function completeWithProvider(
  provider: HelpProviderName,
  prompt: { system: string; messages: ChatMessage[] },
  env: ProviderEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  if (provider === "keyword") throw new Error("keyword");
  const controller = AbortSignal.timeout(12000);
  if (provider === "openai") {
    const response = await fetchImpl("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller,
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: env.HELP_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.2,
        messages: [{ role: "system", content: prompt.system }, ...prompt.messages],
      }),
    });
    if (!response.ok) throw new Error("openai");
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("openai-empty");
    return text;
  }
  const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: controller,
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.HELP_MODEL?.trim() || "claude-3-5-haiku-20241022",
      max_tokens: 700,
      temperature: 0.2,
      system: prompt.system,
      messages: prompt.messages,
    }),
  });
  if (!response.ok) throw new Error("anthropic");
  const payload = (await response.json()) as { content?: { text?: string }[] };
  const text = payload.content?.map((block) => block.text || "").join("").trim();
  if (!text) throw new Error("anthropic-empty");
  return text;
}
