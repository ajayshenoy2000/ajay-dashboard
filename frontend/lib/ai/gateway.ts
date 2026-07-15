import { generateText, streamText, stepCountIs, type ToolSet } from "ai";
import { getOpenRouter, openRouterAvailable } from "./provider";
import { USE_CASES, OVERRIDABLE_MODELS, type UseCaseKey } from "./useCases";
import { logUsage } from "./usage";
import { GatewayError } from "./errors";

export interface GatewayMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface GatewayRequest {
  system?: string;
  prompt?: string;
  messages?: GatewayMessage[];
  maxTokens?: number;
  temperature?: number;
  tools?: ToolSet;
  modelOverride?: string;
  userId?: string;
  // streamGateway only: called once the stream finishes, with the full text —
  // used by the chatbot (Phase 7) to persist the assistant's reply after
  // streaming it to the client, without the caller needing its own onFinish.
  onFinish?: (text: string) => void;
}

export interface GatewayResponse {
  text: string;
  usage: { promptTokens?: number; completionTokens?: number };
  model: string;
  costUsd: number | null;
  toolCalls?: unknown;
}

function resolveModel(useCase: UseCaseKey, modelOverride?: string) {
  const uc = USE_CASES[useCase];
  if (!modelOverride) return { modelSlug: uc.primary as string, models: uc.models.slice() as string[] };
  if (!("allowOverride" in uc) || !uc.allowOverride) {
    throw new GatewayError(`Use case "${useCase}" does not allow a model override`);
  }
  if (!OVERRIDABLE_MODELS.includes(modelOverride)) {
    throw new GatewayError(`Model "${modelOverride}" is not in the allowed override list`);
  }
  return { modelSlug: modelOverride, models: [modelOverride] };
}

// Single-call, non-streaming gateway entry point. OpenRouter performs cross-model
// fallback server-side via the `models` array — there is no custom retry loop here.
export async function callGateway(useCase: UseCaseKey, req: GatewayRequest): Promise<GatewayResponse> {
  if (!openRouterAvailable()) {
    throw new GatewayError("OPENROUTER_API_KEY is not configured");
  }
  const uc = USE_CASES[useCase];
  const { modelSlug, models } = resolveModel(useCase, req.modelOverride);

  const openrouter = getOpenRouter();
  const model = openrouter.chat(modelSlug, { models, usage: { include: true } });

  const start = Date.now();
  try {
    const result = await generateText({
      model,
      system: req.system,
      ...(req.messages ? { messages: req.messages } : { prompt: req.prompt ?? "" }),
      maxOutputTokens: req.maxTokens ?? uc.maxTokens,
      temperature: req.temperature ?? uc.temperature,
      tools: req.tools,
      stopWhen: stepCountIs(4),
    });

    const latencyMs = Date.now() - start;
    const openrouterMeta = result.providerMetadata?.openrouter as
      | { usage?: { cost?: number } }
      | undefined;
    const costUsd = openrouterMeta?.usage?.cost ?? null;

    logUsage({
      userId: req.userId,
      useCase,
      model: modelSlug,
      provider: "openrouter",
      success: true,
      latencyMs,
      promptTokens: result.usage?.inputTokens ?? null,
      completionTokens: result.usage?.outputTokens ?? null,
      costUsd,
    });

    return {
      text: result.text,
      usage: { promptTokens: result.usage?.inputTokens, completionTokens: result.usage?.outputTokens },
      model: modelSlug,
      costUsd,
      toolCalls: result.toolCalls,
    };
  } catch (err) {
    logUsage({
      userId: req.userId,
      useCase,
      model: modelSlug,
      provider: "openrouter",
      success: false,
      latencyMs: Date.now() - start,
    });
    throw new GatewayError(`Gateway call failed for use case "${useCase}"`, err);
  }
}

// Streaming sibling used by the chatbot (Phase 7) — same model resolution, but returns
// the AI SDK's stream result directly so the caller can pipe it to a UI message stream.
export function streamGateway(useCase: UseCaseKey, req: GatewayRequest) {
  if (!openRouterAvailable()) {
    throw new GatewayError("OPENROUTER_API_KEY is not configured");
  }
  const uc = USE_CASES[useCase];
  const { modelSlug, models } = resolveModel(useCase, req.modelOverride);

  const openrouter = getOpenRouter();
  const model = openrouter.chat(modelSlug, { models, usage: { include: true } });

  return streamText({
    model,
    system: req.system,
    ...(req.messages ? { messages: req.messages } : { prompt: req.prompt ?? "" }),
    maxOutputTokens: req.maxTokens ?? uc.maxTokens,
    temperature: req.temperature ?? uc.temperature,
    tools: req.tools,
    stopWhen: stepCountIs(4),
    onFinish: (result) => {
      const openrouterMeta = result.providerMetadata?.openrouter as
        | { usage?: { cost?: number } }
        | undefined;
      logUsage({
        userId: req.userId,
        useCase,
        model: modelSlug,
        provider: "openrouter",
        success: true,
        latencyMs: 0,
        promptTokens: result.usage?.inputTokens ?? null,
        completionTokens: result.usage?.outputTokens ?? null,
        costUsd: openrouterMeta?.usage?.cost ?? null,
      });
      req.onFinish?.(result.text);
    },
  });
}
