export interface ImageGenerationOptions {
  aspectRatio?: string;
  imageSize?: string;
}

export interface ImageGenerationProvider {
  generateImage(
    prompt: string,
    options?: ImageGenerationOptions,
  ): Promise<string>;
}
