import type { ImageGenerationProvider } from "./types";

const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504, 524]);
const DEFAULT_IMAGE_PRESET: OpenAIImagePreset = {
  size: "1536x1024",
  quality: "medium",
};
const FALLBACK_IMAGE_PRESET: OpenAIImagePreset = {
  size: "1536x1024",
  quality: "low",
};

interface OpenAIImagePreset {
  size: "1536x1024";
  quality: "low" | "medium";
}

interface OpenAIImageResponse {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: {
    message?: string;
  };
}

class OpenAIImageRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "OpenAIImageRequestError";
  }
}

export class OpenAICompatibleImageProvider implements ImageGenerationProvider {
  private readonly apiEndpoint: string;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    apiBaseUrl: string,
  ) {
    this.apiEndpoint = normalizeOpenAIEndpoint(apiBaseUrl);
  }

  async generateImage(prompt: string): Promise<string> {
    try {
      return await this.generateWithPreset(prompt, DEFAULT_IMAGE_PRESET);
    } catch (error) {
      if (!shouldRetryWithLowerQuality(error)) {
        throw error;
      }

      ztoolkit.log(
        "[OpenAICompatibleImageProvider] Image generation failed at medium quality; retrying at low quality",
      );
      return this.generateWithPreset(prompt, FALLBACK_IMAGE_PRESET);
    }
  }

  private async generateWithPreset(
    prompt: string,
    preset: OpenAIImagePreset,
  ): Promise<string> {
    const response = await this.fetchWithRetry(
      `${this.apiEndpoint}/images/generations`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          n: 1,
          size: preset.size,
          quality: preset.quality,
          output_format: "png",
          response_format: "b64_json",
        }),
      },
    );

    const rawText = await response.text();
    let data: OpenAIImageResponse;
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      const message = `OpenAI image API returned invalid JSON (${response.status}). Response start: ${rawText.slice(0, 100)}...`;
      if (!response.ok) {
        throw new OpenAIImageRequestError(message, response.status);
      }
      throw new Error(message);
    }

    if (!response.ok) {
      throw new OpenAIImageRequestError(
        `OpenAI image API error (${response.status}): ${data.error?.message || response.statusText}`,
        response.status,
      );
    }

    const image = data.data?.[0];
    if (image?.b64_json) {
      return stripDataUrlPrefix(image.b64_json);
    }
    if (image?.url) {
      return this.downloadImageAsBase64(image.url);
    }

    throw new Error("No image data received from OpenAI-compatible provider");
  }

  private async downloadImageAsBase64(url: string): Promise<string> {
    const response = await this.fetchWithRetry(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download generated image (${response.status} ${response.statusText})`,
      );
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      throw new Error("Generated image download returned an empty file");
    }

    return arrayBufferToBase64(buffer, response.headers.get("Content-Type"));
  }

  private async fetchWithRetry(
    url: string,
    init?: RequestInit,
    maxAttempts: number = 3,
  ): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(url, init);
        if (
          !RETRYABLE_STATUS_CODES.has(response.status) ||
          attempt === maxAttempts - 1
        ) {
          return response;
        }
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts - 1) {
          throw error;
        }
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt)),
      );
    }

    throw lastError || new Error("OpenAI image request failed");
  }
}

export function isOpenAICompatibleImageModel(model: string): boolean {
  return /^(?:gpt-image-|dall-e-)/i.test(model.trim());
}

function normalizeOpenAIEndpoint(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  if (!normalized) {
    throw new Error(
      "GPT image models require a custom OpenAI-compatible API Base URL",
    );
  }

  if (/\/v1beta$/i.test(normalized)) {
    return normalized.replace(/\/v1beta$/i, "/v1");
  }
  if (/\/v1$/i.test(normalized)) {
    return normalized;
  }
  return `${normalized}/v1`;
}

function shouldRetryWithLowerQuality(error: unknown): boolean {
  if (!(error instanceof OpenAIImageRequestError)) {
    return false;
  }

  return (
    error.status === 400 ||
    error.status === 413 ||
    error.status === 422 ||
    error.status === 429 ||
    error.status >= 500
  );
}

function stripDataUrlPrefix(data: string): string {
  return data.replace(/^data:image\/[^;]+;base64,/i, "");
}

function arrayBufferToBase64(
  buffer: ArrayBuffer,
  mimeType: string | null,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to encode downloaded image"));
        return;
      }
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () =>
      reject(new Error("Failed to encode downloaded image"));
    reader.readAsDataURL(
      new Blob([buffer], { type: mimeType || "application/octet-stream" }),
    );
  });
}
