import { generateText, streamText, stepCountIs, type ModelMessage, type ToolSet } from "ai";
import { getOpenRouter, openRouterAvailable } from "./provider";
import { USE_CASES, type UseCaseKey } from "./useCases";
import { logUsage } from "./usage";
import { GatewayError } from "./errors";

export interface GatewayRequest {
  system?: string;
  prompt?: string;
  messages?: ModelMessage[];
  maxTokens?: number;
  temperature?: number;
  tools?: ToolSet;
  userId?: string;
  sessionId?: string;
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

function resolveModel(useCase: UseCaseKey) {
  const uc = USE_CASES[useCase];
  return { modelSlug: uc.primary as string, models: uc.models.slice() as string[] };
}

function reasoningFor(useCase: UseCaseKey) {
  if (useCase === "mio-maintenance") return { effort: "none" as const, exclude: true };
  if (useCase === "chatbot") return { effort: "minimal" as const, exclude: true };
  return { effort: "low" as const, exclude: true };
}

// Single-call, non-streaming gateway entry point. OpenRouter performs cross-model
// fallback server-side via the `models` array — there is no custom retry loop here.
export async function callGateway(useCase: UseCaseKey, req: GatewayRequest): Promise<GatewayResponse> {
  if (!openRouterAvailable()) {
    throw new GatewayError("OPENROUTER_API_KEY is not configured");
  }
  const uc = USE_CASES[useCase];
  const { modelSlug, models } = resolveModel(useCase);

  const openrouter = getOpenRouter();
  const model = openrouter.chat(modelSlug, {
    models,
    reasoning: reasoningFor(useCase),
    usage: { include: true },
    user: req.userId,
    provider: { allow_fallbacks: true, require_parameters: true, data_collection: "deny", sort: "latency" },
    ...(req.sessionId ? { extraBody: { session_id: req.sessionId } } : {}),
  });

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
  const { modelSlug, models } = resolveModel(useCase);

  const openrouter = getOpenRouter();
  const model = openrouter.chat(modelSlug, {
    models,
    reasoning: reasoningFor(useCase),
    usage: { include: true },
    user: req.userId,
    provider: { allow_fallbacks: true, require_parameters: true, data_collection: "deny", sort: "latency" },
    ...(req.sessionId ? { extraBody: { session_id: req.sessionId } } : {}),
  });

  const start = Date.now();

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
        latencyMs: Date.now() - start,
        promptTokens: result.usage?.inputTokens ?? null,
        completionTokens: result.usage?.outputTokens ?? null,
        costUsd: openrouterMeta?.usage?.cost ?? null,
      });
      req.onFinish?.(result.text);
    },
  });
}
