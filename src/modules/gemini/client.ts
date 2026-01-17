/**
 * Gemini API Client for Zotero
 * Uses @google/genai SDK with File API support for large PDFs
 */

// Note: @google/genai will be bundled by esbuild
// For Zotero environment, we use fetch-based approach that mimics SDK behavior

const PDF_SIZE_THRESHOLD = 20 * 1024 * 1024; // 20MB
const DEFAULT_API_BASE = "https://generativelanguage.googleapis.com";
const API_VERSION_PATH = "/v1beta";

export interface GeminiConfig {
    apiKey: string;
    model: string;
    apiEndpoint?: string;
}

export interface GenerationConfig {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
}

export interface ChatMessage {
    role: "user" | "model";
    parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string }; fileData?: { mimeType: string; fileUri: string } }>;
}

export interface GenerateContentResponse {
    text: string;
    images?: string[]; // Base64 encoded images
    raw?: any;
}

export class GeminiClient {
    private apiKey: string;
    private model: string;
    private apiEndpoint: string;
    private generationConfig: GenerationConfig;

    constructor(
        apiKey: string,
        model: string = "gemini-3-flash-preview", // Updated default to Flash Preview (optimized for text/multimodal)
        apiEndpoint?: string,
        generationConfig?: GenerationConfig
    ) {
        this.apiKey = apiKey;
        this.model = model;
        // Normalize endpoint: remove trailing slash
        const base = apiEndpoint?.trim() || DEFAULT_API_BASE;
        this.apiEndpoint = normalizeApiEndpoint(base);
        // Set generation config with defaults
        this.generationConfig = {
            temperature: generationConfig?.temperature ?? 1.0,
            topP: generationConfig?.topP ?? 0.95,
            topK: generationConfig?.topK ?? 40,
            maxOutputTokens: generationConfig?.maxOutputTokens ?? 8192,
        };
    }

    /**
     * Check if PDF should use File API (>20MB)
     */
    private shouldUseFileApi(data: ArrayBuffer): boolean {
        return data.byteLength > PDF_SIZE_THRESHOLD;
    }

    /**
     * Convert ArrayBuffer to base64 efficiently using FileReader
     */
    private async arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
        return new Promise((resolve, reject) => {
            const blob = new Blob([buffer], { type: "application/pdf" });
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // Remove data URL prefix (e.g., "data:application/pdf;base64,")
                const base64 = result.split(",")[1];
                resolve(base64);
            };
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Upload file using Gemini Files API with timeout
     */
    async uploadFile(data: ArrayBuffer, mimeType: string, displayName: string): Promise<{ uri: string; mimeType: string }> {
        // Step 1: Start resumable upload
        const startUrl = `${this.apiEndpoint}/upload/v1beta/files?key=${this.apiKey}`;
        const startResponse = await fetch(startUrl, {
            method: "POST",
            headers: {
                "X-Goog-Upload-Protocol": "resumable",
                "X-Goog-Upload-Command": "start",
                "X-Goog-Upload-Header-Content-Length": String(data.byteLength),
                "X-Goog-Upload-Header-Content-Type": mimeType,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ file: { display_name: displayName } }),
        });

        if (!startResponse.ok) {
            throw new Error(`Failed to initiate upload: ${startResponse.statusText}`);
        }

        const uploadUrl = startResponse.headers.get("X-Goog-Upload-URL");
        if (!uploadUrl) {
            throw new Error("Failed to get upload URL from Files API");
        }

        // Step 2: Upload bytes
        const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "Content-Length": String(data.byteLength),
                "X-Goog-Upload-Offset": "0",
                "X-Goog-Upload-Command": "upload, finalize",
            },
            body: data,
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }

        const fileInfo = (await uploadResponse.json()) as unknown as { file: { name: string; state: string; uri: string } };

        // Step 3: Wait for processing with timeout (e.g. 60s)
        const fileName = fileInfo.file.name;
        let fileState = fileInfo.file.state;
        const startTime = Date.now();
        const timeout = 60000; // 60 seconds

        while (fileState === "PROCESSING") {
            if (Date.now() - startTime > timeout) {
                throw new Error("File processing timed out");
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
            const statusResponse = await fetch(
                `${this.apiEndpoint}/files/${fileName}?key=${this.apiKey}`
            );
            const statusData = (await statusResponse.json()) as unknown as { state: string };
            fileState = statusData.state;

            if (fileState === "FAILED") {
                throw new Error("Gemini failed to process the uploaded file");
            }
        }

        return {
            uri: fileInfo.file.uri as string,
            mimeType: mimeType,
        };
    }

    /**
     * Analyze PDF with optional structured output schema
     */
    async analyzePdf(
        pdfData: ArrayBuffer,
        prompt: string,
        schema?: object,
        history?: ChatMessage[]
    ): Promise<GenerateContentResponse> {
        let contents: ChatMessage[];

        if (this.shouldUseFileApi(pdfData)) {
            // Use File API for large PDFs
            const fileInfo = await this.uploadFile(pdfData, "application/pdf", "document.pdf");

            contents = history ? [...history] : [];
            contents.push({
                role: "user",
                parts: [
                    { fileData: { mimeType: fileInfo.mimeType, fileUri: fileInfo.uri } },
                    { text: prompt },
                ],
            });
        } else {
            // Use inline data for smaller PDFs
            // Await the optimized base64 conversion
            const base64Data = await this.arrayBufferToBase64(pdfData);

            contents = history ? [...history] : [];
            contents.push({
                role: "user",
                parts: [
                    { inlineData: { mimeType: "application/pdf", data: base64Data } },
                    { text: prompt },
                ],
            });
        }

        return this.generateContent(contents, schema);
    }

    /**
     * Simple text chat (for follow-up questions after PDF is loaded)
     */
    async chat(
        prompt: string,
        history?: ChatMessage[]
    ): Promise<GenerateContentResponse> {
        const contents: ChatMessage[] = history ? [...history] : [];
        contents.push({
            role: "user",
            parts: [{ text: prompt }],
        });

        return this.generateContent(contents);
    }

    /**
     * Core content generation method
     */
    /**
     * Core content generation method
     */
    private async generateContent(
        contents: ChatMessage[],
        schema?: object
    ): Promise<GenerateContentResponse> {
        const url = `${this.apiEndpoint}/models/${this.model}:generateContent?key=${this.apiKey}`;

        const requestBody: any = { contents };

        // Build generation config from instance settings
        const generationConfig: any = {
            temperature: this.generationConfig.temperature,
            topP: this.generationConfig.topP,
            topK: this.generationConfig.topK,
            maxOutputTokens: this.generationConfig.maxOutputTokens,
        };

        if (schema) {
            generationConfig.responseMimeType = "application/json";
            generationConfig.responseSchema = schema;
        }

        requestBody.generationConfig = generationConfig;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });

        const rawText = await response.text();
        let data: any;
        try {
            data = rawText ? JSON.parse(rawText) : {};
        } catch {
            const errorMsg = mapHttpError(response.status, response.statusText);
            throw new Error(`Gemini API Error: ${errorMsg}. Response start: ${rawText.slice(0, 100)}...`);
        }

        if (!response.ok) {
            const errorMsg = mapHttpError(response.status, response.statusText);
            throw new Error(`Gemini API Error: ${errorMsg}. Details: ${data?.error?.message || "None"}`);
        }

        const text = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || "";

        // Extract images from inlineData
        const images: string[] = [];
        data.candidates?.[0]?.content?.parts?.forEach((part: any) => {
            if (part.inlineData && part.inlineData.data) {
                images.push(part.inlineData.data);
            }
        });

        return {
            text,
            images: images.length > 0 ? images : undefined,
            raw: data,
        };
    }

    /**
     * Generate Image using Gemini 3 Pro Image model
     * This is a specialized simplified method for the visual insights workflow
     */
    async generateImage(
        prompt: string,
        imageConfig: { aspectRatio?: string; imageSize?: string } = { aspectRatio: "16:9", imageSize: "2K" }
    ): Promise<string> {
        // Temporarily switch model to image model (or use a separate client instance, but modifying state is cheaper here)
        const originalModel = this.model;
        this.model = "gemini-3-pro-image-preview"; // Force use of image model

        try {
            const url = `${this.apiEndpoint}/models/${this.model}:generateContent?key=${this.apiKey}`;

            const requestBody = {
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    responseModalities: ["TEXT", "IMAGE"],
                    imageConfig: imageConfig
                }
            };

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            const rawText = await response.text();
            let data: any;
            try {
                data = JSON.parse(rawText);
            } catch {
                const errorMsg = mapHttpError(response.status, response.statusText);
                throw new Error(`Gemini API Error: ${errorMsg}. Response start: ${rawText.slice(0, 100)}...`);
            }

            if (!response.ok) {
                const errorMsg = mapHttpError(response.status, response.statusText);
                throw new Error(`Gemini Image API Error: ${errorMsg}. Details: ${data?.error?.message || "None"}`);
            }

            // Extract the image
            const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
            if (!imagePart || !imagePart.inlineData?.data) {
                throw new Error("No image data received from Gemini");
            }

            return imagePart.inlineData.data;
        } finally {
            this.model = originalModel; // Restore original model
        }
    }

    /**
     * Set the model to use
     */
    setModel(model: string) {
        this.model = model;
    }

    /**
     * Get current model
     */
    getModel(): string {
        return this.model;
    }
}

function normalizeApiEndpoint(baseUrl: string): string {
    let normalized = baseUrl.trim().replace(/\/+$/, "");
    if (!normalized) {
        normalized = DEFAULT_API_BASE;
    }

    // Only append version if not already present in some form
    if (!normalized.includes("/v1beta") && !normalized.includes("/v1")) {
        normalized += API_VERSION_PATH;
    }

    return normalized;
}

function mapHttpError(status: number, statusText: string): string {
    switch (status) {
        case 400: return `400 Bad Request (Check your request format)`;
        case 401: return `401 Unauthorized (Check your API Key)`;
        case 403: return `403 Forbidden (API Key invalid or location blocked)`;
        case 404: return `404 Not Found (Model not supported by this provider)`;
        case 429: return `429 Too Many Requests (Rate limit exceeded)`;
        case 500: return `500 Internal Server Error (Provider error)`;
        case 502: return `502 Bad Gateway (Provider invalid response)`;
        case 503: return `503 Service Unavailable (Provider overloaded)`;
        case 504: return `504 Gateway Timeout (Provider stopped waiting)`;
        case 524: return `524 Provider Timeout (Analysis took too long, try a faster provider)`;
        default: return `${status} ${statusText}`;
    }
}
