const DEFAULT_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

export type OpenAIResult = { content: string; model: string };

export async function callOpenAI({
  prompt,
  system,
  model = process.env.OPENAI_MODEL || DEFAULT_MODEL,
  baseUrl = process.env.OPENAI_BASE_URL || DEFAULT_URL,
  apiKey = process.env.OPENAI_API_KEY,
  timeoutMs = 120_000,
}: {
  prompt: string;
  system?: string;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}): Promise<OpenAIResult> {
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI responded ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      model?: string;
      choices?: { message?: { content?: string } }[];
    };
    const content = (json.choices?.[0]?.message?.content ?? "").trim();
    if (!content) throw new Error("OpenAI returned empty response");
    return { content, model: json.model ?? model };
  } finally {
    clearTimeout(timer);
  }
}
