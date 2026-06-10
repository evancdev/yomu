import type {
  ConfigResponse,
  RenderRequest,
  RenderResponse,
  ScriptRequest,
  ScriptResponse,
} from "@shared/types";

/** Thrown for any non-2xx API response, carrying the server's error message. */
export class ApiRequestError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiRequestError("Network error — is the server running?");
  }

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new ApiRequestError(message);
  }

  return body as T;
}

export function getConfig(): Promise<ConfigResponse> {
  return request<ConfigResponse>("/api/config");
}

export function draftScript(req: ScriptRequest): Promise<ScriptResponse> {
  return request<ScriptResponse>("/api/script", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function renderManga(req: RenderRequest): Promise<RenderResponse> {
  return request<RenderResponse>("/api/render", {
    method: "POST",
    body: JSON.stringify(req),
  });
}
