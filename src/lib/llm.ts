import { callOllama } from "./ollama";
import { callOpenAI } from "./openai";

export type LLMResult = { content: string; model: string };

export type LLMProvider = "ollama" | "openai";

export function resolveProvider(raw = process.env.LLM_PROVIDER): LLMProvider {
  const p = (raw ?? "ollama").toLowerCase();
  if (p === "openai") return "openai";
  if (p === "ollama") return "ollama";
  throw new Error(`Unknown LLM_PROVIDER: ${raw}`);
}

export async function callLLM(input: {
  prompt: string;
  system?: string;
  provider?: LLMProvider;
}): Promise<LLMResult> {
  const provider = input.provider ?? resolveProvider();
  if (provider === "openai") {
    return callOpenAI({ prompt: input.prompt, system: input.system });
  }
  return callOllama({ prompt: input.prompt, system: input.system });
}
