// Zernio API client — server-only (API key fica no servidor)
// Docs: https://docs.zernio.com
// Base URL: https://zernio.com/api/v1

import { randomUUID } from "node:crypto";

const BASE_URL = "https://zernio.com/api/v1";

interface ZernioMediaItem {
  type: "image" | "video";
  url: string;
}

interface ZernioPlatformTarget {
  platform: string;
  accountId: string;
}

interface ZernioPostRequest {
  content?: string;
  platforms: ZernioPlatformTarget[];
  mediaItems?: ZernioMediaItem[];
  publishNow?: boolean;
  scheduledFor?: string; // ISO 8601
  timezone?: string; // IANA, required if scheduledFor set
}

interface ZernioPostResponse {
  id: string;
  status: string;
  content?: string;
  platforms: { platform: string; status: string; accountId: string }[];
  scheduledFor?: string;
  publishedAt?: string;
  createdAt: string;
}

export class ZernioError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ZernioError";
  }
}

function getApiKey(): string {
  const key = process.env.ZERNIO_API_KEY;
  if (!key) throw new ZernioError("ZERNIO_API_KEY não configurada no servidor.");
  return key;
}

async function zernioFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ZernioError(
      `Zernio API error (${res.status}): ${body}`,
      res.status,
      body,
    );
  }

  return res.json() as Promise<T>;
}

/**
 * Cria e publica/agenda um post no Zernio.
 * Usa x-request-id (UUID) para idempotência — retry com mesmo UUID em ~5min
 * retorna o post original em vez de duplicar.
 *
 * Se `scheduledFor` for omitido e `publishNow` não for true, salva como rascunho.
 * Se `scheduledFor` for fornecido, agenda para aquela data/hora.
 */
export async function createZernioPost(params: {
  content: string;
  imageUrl?: string;
  platform: "instagram" | "facebook" | "twitter";
  accountId: string;
  scheduledFor?: string; // ISO string
}): Promise<ZernioPostResponse> {
  const body: ZernioPostRequest = {
    content: params.content,
    platforms: [{ platform: params.platform, accountId: params.accountId }],
  };

  if (params.imageUrl) {
    body.mediaItems = [{ type: "image", url: params.imageUrl }];
  }

  if (params.scheduledFor) {
    body.scheduledFor = params.scheduledFor;
    body.timezone = "America/Sao_Paulo";
  } else {
    body.publishNow = true;
  }

  return zernioFetch<ZernioPostResponse>("/posts", {
    method: "POST",
    headers: { "x-request-id": randomUUID() },
    body: JSON.stringify(body),
  });
}

/**
 * Busca o status de um post pelo ID Zernio.
 */
export async function getZernioPostStatus(
  zernioPostId: string,
): Promise<ZernioPostResponse> {
  return zernioFetch<ZernioPostResponse>(`/posts/${zernioPostId}`);
}

/**
 * Deleta um post rascunho ou agendado no Zernio.
 * Posts publicados não podem ser deletados.
 */
export async function deleteZernioPost(
  zernioPostId: string,
): Promise<{ message: string }> {
  return zernioFetch<{ message: string }>(`/posts/${zernioPostId}`, {
    method: "DELETE",
  });
}
