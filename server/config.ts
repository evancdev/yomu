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
    // Akamai Inference Cloud (OpenAI-compatible) — for LLM_PROVIDER=akamai.
    akamaiApiKey: str("AKAMAI_API_KEY"),
    akamaiApiUrl: str("AKAMAI_INFERENCE_URL", "https://inference.akamai.com"),
    akamaiModel: str("AKAMAI_LLM_MODEL", "llama-3.3-70b-instruct"),
  },

  image: {
    provider: str("IMAGE_PROVIDER", "mock").toLowerCase(),
    magnificApiKey: str("MAGNIFIC_API_KEY"),
    magnificApiUrl: str("MAGNIFIC_API_URL", "https://api.magnific.com"),
    magnificModel: str("MAGNIFIC_MODEL", "auto"),
    // Akamai Inference Cloud GPU image gen — for IMAGE_PROVIDER=akamai.
    akamaiApiKey: str("AKAMAI_API_KEY"),
    akamaiApiUrl: str("AKAMAI_INFERENCE_URL", "https://inference.akamai.com"),
    akamaiModel: str("AKAMAI_IMAGE_MODEL", "flux-1-schnell"),
  },

  // Optional delivery layer: persist rendered panels to S3-compatible object
  // storage and serve them through Image & Video Manager / CDN. Provider-agnostic.
  storage: {
    provider: str("STORAGE_PROVIDER", "none").toLowerCase(),
    bucket: str("AKAMAI_S3_BUCKET"),
    region: str("AKAMAI_S3_REGION", "us-east-1"),
    // Host without the bucket prefix; defaults to the Linode regional endpoint.
    endpoint: str("AKAMAI_S3_ENDPOINT"),
    accessKey: str("AKAMAI_S3_ACCESS_KEY"),
    secretKey: str("AKAMAI_S3_SECRET_KEY"),
    keyPrefix: str("AKAMAI_S3_PREFIX", "panels/"),
    // Image & Video Manager / CDN hostname mapped to the bucket origin.
    deliveryBase: str("AKAMAI_DELIVERY_BASE"),
  },
} as const;
