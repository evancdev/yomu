import crypto from "node:crypto";
import type { DeliveryStore } from "./types";

/**
 * Akamai Cloud (Linode) Object Storage + Image & Video Manager delivery store.
 *
 * Flow per panel:
 *   1. Resolve the image bytes (decode a data URI, or fetch a provider URL).
 *   2. Content-address by SHA-256 and PUT to an S3-compatible bucket
 *      (`{bucket}.{endpoint}`), public-read. Identical panels dedupe for free.
 *   3. Return a delivery URL. If `deliveryBase` (an Image & Video Manager / CDN
 *      hostname mapped to the bucket origin) is set, the URL points there so
 *      Akamai serves per-device AVIF/WebP at the edge automatically; otherwise it
 *      points straight at the bucket.
 *
 * Uses a hand-rolled AWS SigV4 signer over `node:crypto` + `fetch` so it adds no
 * new dependency — matching the repo's lean, fetch-based provider style.
 *
 * Never used on failure placeholders (the render route skips those), and the
 * caller treats persistence as best-effort: a throw here just falls back to the
 * direct provider URL.
 */
export class AkamaiObjectStore implements DeliveryStore {
  readonly name = "akamai";
  private bucket: string;
  private region: string;
  private endpoint: string;
  private accessKey: string;
  private secretKey: string;
  private keyPrefix: string;
  private deliveryBase: string;

  constructor(opts: {
    bucket: string;
    region: string;
    endpoint: string;
    accessKey: string;
    secretKey: string;
    keyPrefix: string;
    deliveryBase: string;
  }) {
    const missing = (["bucket", "accessKey", "secretKey"] as const).filter((k) => !opts[k]);
    if (missing.length) {
      const envName = (k: string) =>
        k === "accessKey" ? "ACCESS_KEY" : k === "secretKey" ? "SECRET_KEY" : "BUCKET";
      throw new Error(
        `akamai storage requires ${missing.map((k) => `AKAMAI_S3_${envName(k)}`).join(", ")}`,
      );
    }
    this.bucket = opts.bucket;
    this.region = opts.region;
    this.endpoint = opts.endpoint.replace(/^https?:\/\//, "").replace(/\/$/, "");
    this.accessKey = opts.accessKey;
    this.secretKey = opts.secretKey;
    this.keyPrefix = opts.keyPrefix.replace(/^\/+/, "");
    this.deliveryBase = opts.deliveryBase.replace(/\/$/, "");
  }

  async persist(input: { panelId: string; imageUrl: string }): Promise<string> {
    const { bytes, contentType, ext } = await resolveBytes(input.imageUrl);
    const hash = sha256hex(bytes);
    const key = `${this.keyPrefix}${hash}.${ext}`;
    await this.putObject(key, bytes, contentType);
    return this.deliveryUrl(key);
  }

  private deliveryUrl(key: string): string {
    const path = key.split("/").map(encodeRfc3986).join("/");
    if (this.deliveryBase) return `${this.deliveryBase}/${path}`;
    return `https://${this.bucket}.${this.endpoint}/${path}`;
  }

  /** PUT an object to the S3-compatible bucket, signed with AWS SigV4. */
  private async putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
    const host = `${this.bucket}.${this.endpoint}`;
    const service = "s3";
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
    const dateStamp = amzDate.slice(0, 8);
    const canonicalUri = "/" + key.split("/").map(encodeRfc3986).join("/");
    const payloadHash = sha256hex(body);

    const canonicalHeaders =
      `host:${host}\n` +
      `x-amz-acl:public-read\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-acl;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = [
      "PUT",
      canonicalUri,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const scope = `${dateStamp}/${this.region}/${service}/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      scope,
      sha256hex(canonicalRequest),
    ].join("\n");

    const kDate = hmac(`AWS4${this.secretKey}`, dateStamp);
    const kRegion = hmac(kDate, this.region);
    const kService = hmac(kRegion, service);
    const kSigning = hmac(kService, "aws4_request");
    const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    const authorization =
      `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Copy into a view backed by a plain ArrayBuffer. fetch's BodyInit type
    // rejects the SharedArrayBuffer possibility in Uint8Array<ArrayBufferLike>;
    // these bytes are identical to `body`, so payloadHash still matches.
    const ab = new ArrayBuffer(body.byteLength);
    new Uint8Array(ab).set(body);

    const res = await fetch(`https://${host}${canonicalUri}`, {
      method: "PUT",
      headers: {
        Authorization: authorization,
        "x-amz-acl": "public-read",
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        "Content-Type": contentType,
      },
      body: new Uint8Array(ab),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Object storage PUT ${res.status}: ${t.slice(0, 200)}`);
    }
  }
}

/** Decode a data URI or fetch a remote URL into raw bytes + a content type. */
async function resolveBytes(
  imageUrl: string,
): Promise<{ bytes: Uint8Array; contentType: string; ext: string }> {
  if (imageUrl.startsWith("data:")) {
    const m = imageUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
    if (!m) throw new Error("invalid data URI");
    const contentType = m[1] || "application/octet-stream";
    const isBase64 = Boolean(m[2]);
    const data = m[3];
    const bytes = isBase64
      ? new Uint8Array(Buffer.from(data, "base64"))
      : new TextEncoder().encode(decodeURIComponent(data));
    return { bytes, contentType, ext: extFor(contentType) };
  }

  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`fetch source image ${res.status}`);
  const contentType = (res.headers.get("content-type") || "image/png").split(";")[0].trim();
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { bytes, contentType, ext: extFor(contentType) };
}

function extFor(contentType: string): string {
  switch (contentType) {
    case "image/svg+xml":
      return "svg";
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

function hmac(key: crypto.BinaryLike, msg: string): Buffer {
  return crypto.createHmac("sha256", key).update(msg).digest();
}

function sha256hex(data: crypto.BinaryLike): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/** RFC 3986 encoding for S3 path segments (encodeURIComponent + the extras). */
function encodeRfc3986(segment: string): string {
  return encodeURIComponent(segment).replace(
    /[!*'()]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}
