/**
 * Delivery store — an optional layer that persists rendered panel art to durable
 * object storage and returns an optimized, edge-delivered URL.
 *
 * It sits AFTER any ImageProvider (mock or live): rendering produces an image
 * (often an ephemeral provider URL or an inline data URI), and the delivery
 * store gives it a stable home + a CDN/Image-and-Video-Manager URL so a
 * re-opened or exported manga never has to be re-rendered (the spec calls out
 * render as the expensive step). It is provider-agnostic and best-effort.
 */
export interface DeliveryStore {
  readonly name: string;
  /**
   * Persist a panel image (data URI or remote URL) and return a durable delivery
   * URL. Implementations should be idempotent where possible (e.g. content-addressed
   * keys) so re-rendering the same panel is cheap.
   */
  persist(input: { panelId: string; imageUrl: string }): Promise<string>;
}
