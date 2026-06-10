import { config } from "../config";
import type { ImageProvider, LLMProvider } from "./types";
import { MockLLMProvider } from "./llm/mock";
import { AnthropicLLMProvider } from "./llm/anthropic";
import { MockImageProvider } from "./image/mock";
import { MagnificImageProvider } from "./image/magnific";

/** Build the configured LLM provider, falling back to mock for unknown names. */
export function createLLMProvider(): LLMProvider {
  switch (config.llm.provider) {
    case "anthropic":
      return new AnthropicLLMProvider({
        apiKey: config.llm.anthropicApiKey,
        model: config.llm.model,
      });
    case "mock":
    default:
      return new MockLLMProvider();
  }
}

/** Build the configured image provider, falling back to mock for unknown names. */
export function createImageProvider(): ImageProvider {
  switch (config.image.provider) {
    case "magnific":
      return new MagnificImageProvider({
        apiKey: config.image.magnificApiKey,
        baseUrl: config.image.magnificApiUrl,
        model: config.image.magnificModel,
      });
    case "mock":
    default:
      return new MockImageProvider();
  }
}
