/** Centralized, validated environment configuration. */

function str(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

export const config = {
  port: Number(str("PORT", "8787")),
  isProd: process.env.NODE_ENV === "production",

  llm: {
    provider: str("LLM_PROVIDER", "mock").toLowerCase(),
    anthropicApiKey: str("ANTHROPIC_API_KEY"),
    model: str("LLM_MODEL", "claude-sonnet-4-6"),
  },

  image: {
    provider: str("IMAGE_PROVIDER", "mock").toLowerCase(),
    magnificApiKey: str("MAGNIFIC_API_KEY"),
    magnificApiUrl: str("MAGNIFIC_API_URL", "https://api.magnific.com"),
    magnificModel: str("MAGNIFIC_MODEL", "auto"),
  },
} as const;
