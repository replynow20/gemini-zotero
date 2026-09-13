export interface ImageGenerationProvider {
  generateImage(prompt: string): Promise<string>;
}
