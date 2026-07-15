import { createOpenRouter } from "@openrouter/ai-sdk-provider";

let cached: ReturnType<typeof createOpenRouter> | null = null;

export function getOpenRouter() {
  if (cached) return cached;
  cached = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
    headers: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://ajay-dashboard.vercel.app",
      "X-Title": "Ajay Dashboard",
    },
  });
  return cached;
}

export function openRouterAvailable(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}
