import { DEEPSEEK, MINIMAX, NEMOTRON } from "./models";

export type UseCaseKey = keyof typeof USE_CASES;

export const USE_CASES = {
  "trend-analysis": { primary: MINIMAX, models: [MINIMAX, NEMOTRON], maxTokens: 1024, temperature: 0.4 },
  "keyword-expansion": { primary: MINIMAX, models: [MINIMAX, NEMOTRON], maxTokens: 512, temperature: 0.7 },
  "brief-generation": { primary: NEMOTRON, models: [NEMOTRON, MINIMAX], maxTokens: 4096, temperature: 0.6 },
  chatbot: { primary: NEMOTRON, models: [NEMOTRON], maxTokens: 2048, temperature: 0.7, allowOverride: true },
} as const;

// Every model that may ever be selected via modelOverride (chatbot switcher) must be a valid
// generation target — this is the allowlist `callGateway` validates `modelOverride` against.
export const OVERRIDABLE_MODELS: string[] = [NEMOTRON, MINIMAX, DEEPSEEK];
