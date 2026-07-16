import { MINIMAX, NEMOTRON } from "./models";

export type UseCaseKey = keyof typeof USE_CASES;

export const USE_CASES = {
  "trend-analysis": { primary: MINIMAX, models: [MINIMAX, NEMOTRON], maxTokens: 1024, temperature: 0.4 },
  "keyword-expansion": { primary: MINIMAX, models: [MINIMAX, NEMOTRON], maxTokens: 512, temperature: 0.7 },
  "brief-generation": { primary: NEMOTRON, models: [NEMOTRON, MINIMAX], maxTokens: 4096, temperature: 0.6 },
  chatbot: { primary: MINIMAX, models: [MINIMAX], maxTokens: 1400, temperature: 0.65 },
  "mio-maintenance": { primary: MINIMAX, models: [MINIMAX], maxTokens: 1200, temperature: 0.1 },
} as const;
