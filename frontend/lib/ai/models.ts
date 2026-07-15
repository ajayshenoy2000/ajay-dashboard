// OpenRouter model slugs, verified live against openrouter.ai/models on 2026-07-15.
export const MINIMAX = "minimax/minimax-m3";
export const NEMOTRON = "nvidia/nemotron-3-ultra-550b-a55b";
export const DEEPSEEK = "deepseek/deepseek-v4-pro";

export interface ChatModel {
  slug: string;
  label: string;      // full display name
  short: string;      // compact label for the switcher pill
  maker: string;      // provider name
  color: string;      // brand accent
  mono: string;       // monogram shown in the brand badge
}

// Brand identity per model. We use each provider's brand colour + a clean
// monogram badge rather than reproducing their trademarked logos.
export const CHAT_MODELS: ChatModel[] = [
  { slug: NEMOTRON, label: "Nemotron Ultra", short: "Nemotron", maker: "NVIDIA", color: "#76b900", mono: "N" },
  { slug: MINIMAX, label: "MiniMax M3", short: "MiniMax", maker: "MiniMax", color: "#e8484e", mono: "M" },
  { slug: DEEPSEEK, label: "DeepSeek V4 Pro", short: "DeepSeek", maker: "DeepSeek", color: "#4d6bfe", mono: "D" },
];

export function chatModel(slug: string): ChatModel {
  return CHAT_MODELS.find((m) => m.slug === slug) ?? CHAT_MODELS[0];
}
