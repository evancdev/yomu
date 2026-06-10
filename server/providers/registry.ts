import { config } from "../config";
import type { ImageProvider, LLMProvider } from "./types";
import { MockLLMProvider } from "./llm/mock";
import { AnthropicLLMProvider } from "./llm/anthropic";
import { AkamaiLLMProvider } from "./llm/akamai";
import { MockImageProvider } from "./image/mock";
import { MagnificImageProvider } from "./image/magnific";
import { AkamaiImageProvider } from "./image/akamai";
import type { DeliveryStore } from "../storage/types";
import { NoopDeliveryStore } from "../storage/noop";
import { AkamaiObjectStore } from "../storage/akamai";

/** Build the configured LLM provider, falling back to mock for unknown names. */
export function createLLMProvider(): LLMProvider {
  switch (config.llm.provider) {
    case "anthropic":
      return new AnthropicLLMProvider({
        apiKey: config.llm.anthropicApiKey,
        model: config.llm.model,
      });
    case "akamai":
      return new AkamaiLLMProvider({
        apiKey: config.llm.akamaiApiKey,
        baseUrl: config.llm.akamaiApiUrl,
        model: config.llm.akamaiModel,
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
    case "akamai":
      return new AkamaiImageProvider({
        apiKey: config.image.akamaiApiKey,
        baseUrl: config.image.akamaiApiUrl,
        model: config.image.akamaiModel,
      });
    case "mock":
    default:
      return new MockImageProvider();
  }
}

/** Build the configured delivery store, falling back to a no-op (serve direct). */
export function createDeliveryStore(): DeliveryStore {
  switch (config.storage.provider) {
    case "akamai":
      return new AkamaiObjectStore({
        bucket: config.storage.bucket,
        region: config.storage.region,
        endpoint: config.storage.endpoint || `${config.storage.region}.linodeobjects.com`,
        accessKey: config.storage.accessKey,
        secretKey: config.storage.secretKey,
        keyPrefix: config.storage.keyPrefix,
        deliveryBase: config.storage.deliveryBase,
      });
    case "none":
    default:
      return new NoopDeliveryStore();
  }
}
