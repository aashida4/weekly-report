const DEFAULT_URL = "http://localhost:11434";
const DEFAULT_MODEL = "llama3.1:8b";

export type OllamaResult = { content: string; model: string };

export async function callOllama({
  prompt,
  system,
  model = process.env.OLLAMA_MODEL || DEFAULT_MODEL,
  baseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_URL,
  timeoutMs = 120_000,
}: {
  prompt: string;
  system?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
}): Promise<OllamaResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        ...(system ? { system } : {}),
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Ollama responded ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as { response?: string; model?: string };
    const content = (json.response ?? "").trim();
    if (!content) throw new Error("Ollama returned empty response");
    return { content, model: json.model ?? model };
  } finally {
    clearTimeout(timer);
  }
}
