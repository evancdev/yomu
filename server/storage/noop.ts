import type { DeliveryStore } from "./types";

/**
 * Default delivery store: does nothing. Panel images are served straight from
 * whatever the image provider returned (data URI or provider URL). Keeps the app
 * working end-to-end with zero storage configuration.
 */
export class NoopDeliveryStore implements DeliveryStore {
  readonly name = "none";

  async persist(input: { panelId: string; imageUrl: string }): Promise<string> {
    return input.imageUrl;
  }
}
