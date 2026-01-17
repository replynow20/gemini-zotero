import { GeminiClient } from "../gemini/client";

export type VisualStyle = 'Schematic' | 'Conceptual' | 'Flowchart';

// Progress callback type for step-by-step updates
export type ProgressCallback = (step: string, progress: number) => void;

export class VisualInsightsManager {
    private client: GeminiClient;

    constructor(client: GeminiClient) {
        this.client = client;
    }

    /**
     * Coordinate the 2-step Visual Insights workflow
     * 1. Use Flash (via analyzePdf) to understand the paper and generate a precise image prompt.
     * 2. Use Pro Image (via generateImage) to create the visual.
     * 
     * @param pdfData - The PDF content as ArrayBuffer
     * @param style - The visual style to generate
     * @param onProgress - Optional callback to report progress
     */
    async generateInsight(
        pdfData: ArrayBuffer,
        style: VisualStyle,
        onProgress?: ProgressCallback
    ): Promise<string> {
        // Step 1: Generate the prompt using the context-aware Flash model with Structured Output
        onProgress?.("Analyzing paper with Flash model...", 20);

        const promptGenerationPrompt = this.getPromptForStyle(style);

        // Define the Schema for Gemini Structured Output
        const designSchema = {
            type: "OBJECT",
            properties: {
                subject_description: { type: "STRING", description: "The core subject matter to be visualized." },
                style_keywords: {
                    type: "ARRAY",
                    items: { type: "STRING" },
                    description: "Specific visual style keywords. E.g., '3D cutaway', 'Vector line art', 'Isometric view'"
                },
                composition: { type: "STRING", description: "Layout and composition instruction." },
                color_palette: {
                    type: "STRING",
                    enum: ["Nature_Classic", "Deep_Science", "Engineering_Blueprint", "Medical_Clean", "Warm_Humanities"],
                    description: "The color palette that best fits the paper's domain."
                },
                key_labels: {
                    type: "ARRAY",
                    items: { type: "STRING" },
                    description: "Critical text labels to include. Ensure strict spelling accuracy."
                },
                design_rationale: { type: "STRING", description: "Why this design best fits the paper." }
            },
            required: ["subject_description", "style_keywords", "composition", "color_palette", "key_labels"]
        };

        // analyzePdf handles file upload/caching internally.
        // We pass the schema to force structured JSON output.
        // @ts-ignore - Schema argument is supported in underlying client but might not be in type definition if strict
        const response1 = await this.client.analyzePdf(pdfData, promptGenerationPrompt, designSchema);

        let manifest: any;
        try {
            // response1.text *should* be JSON string, but sometimes it might be wrapped in code blocks
            let jsonText = response1.text.trim();
            if (jsonText.startsWith("```json")) {
                jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
            } else if (jsonText.startsWith("```")) {
                jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
            }
            manifest = JSON.parse(jsonText);
        } catch (e) {
            ztoolkit.log(`[VisualInsights] Failed to parse JSON manifest: ${e}`);
            // Fallback: use the raw text if parse fails
            throw new Error("Failed to generate structured visual design from the paper.");
        }

        ztoolkit.log(`[VisualInsights] Design Manifest:`, manifest);

        // Step 2: Construct the final Image Prompt from the manifest
        const imagePrompt = this.constructImagePrompt(manifest);
        ztoolkit.log(`[VisualInsights] Final Image Prompt:`, imagePrompt);

        // Step 3: Generate the image using the specialized Image model
        onProgress?.("Generating image with Gemini Image model...", 60);

        const base64Image = await this.client.generateImage(imagePrompt, {
            aspectRatio: "16:9",
            imageSize: "2K"
        });

        onProgress?.("Visual generated successfully!", 100);

        return base64Image;
    }

    private constructImagePrompt(manifest: any): string {
        // Nature-style Color Palettes
        const PALETTES: Record<string, string> = {
            "Nature_Classic": "Nature magazine style: Deep Teal (#006D77), Soft Gold (#E29578), Off-white background (#EDF6F9). High contrast, professional scientific publication aesthetic.",
            "Deep_Science": "Scientific dark mode: Deep Navy Blue (#0A192F), Neon Cyan accents (#64FFDA), White text. Futuristic but clean data visualization style.",
            "Engineering_Blueprint": "Technical schematic: Blueprint Blue background (#E3F2FD), Navy lines (#1565C0), Slate Grey structural elements. Clean vector precise lines.",
            "Medical_Clean": "Clinical Medical: Sterile White background, Soft Light Blue (#E3F2FD), Vibrant Red arterial accents (#FF5252), Slate text. Clean, sterile, precise, anatomical accuracy.",
            "Warm_Humanities": "Editorial Warm: Cream background (#FDFBF7), Charcoal text (#2D3436), Terracotta (#E07A5F) and Sage Green (#81B29A) accents. Sophisticated and organic."
        };

        const paletteInstruction = PALETTES[manifest.color_palette] || PALETTES["Nature_Classic"];

        const styleKeywords = manifest.style_keywords ? manifest.style_keywords.join(", ") : "";
        const labels = manifest.key_labels && manifest.key_labels.length > 0
            ? `Include clear, correctly spelled labels: ${manifest.key_labels.join(", ")}. Text should be legible, sans-serif, and integrated into the design.`
            : "No text labels required.";

        return `
**Subject**: ${manifest.subject_description}
**Style**: ${styleKeywords}.
**Composition**: ${manifest.composition}
**Color Palette**: ${paletteInstruction}
**Text**: ${labels}
**Quality**: High fidelity, 8k resolution, scientific publication quality, clean lines, ambient occlusion lighting, 3D render (Blender/C4D style) or precise vector graphics.
`.trim();
    }

    private getPromptForStyle(style: VisualStyle): string {
        const baseInstruction = `
You are an expert scientific design director. 
Your task is to analyze this research paper and create a design manifest for a high-quality visualization.
You must output a JSON object adhering to the specified schema.

DETERMINE THE VISUAL STRATEGY:
- For "Schematic": Analyze the paper to decide the best approach. If it's structural/material, use "3D cutaway" or "microscopic view". If it's a multi-stage platform/system, use "clean isometric architecture" or "exploded view". The goal is to explain the mechanism clearly, whether that requires 3D depth or precise structural layout.
- For "Conceptual": Focus on the core innovation/impact. This can be a "Hero Object" (centralized) or a "Conceptual Composition" (metaphorical). Capture the "Big Idea" with high-end Nature/Science cover aesthetics (studio lighting, elegant materials).
- For "Flowchart": Visualize the methodology/process. Avoid simple flat boxes. Represents steps with high-fidelity 3D assets/icons (e.g., specific instruments, data nodes) arranged spirally, linearly, or cyclically. Use spatial layout to guide the flow.

CHOOSE A COLOR PALETTE:
- Nature_Classic: Biology, Ecology, General Science
- Deep_Science: CS, Physics, AI, Deep Learning
- Engineering_Blueprint: Engineering, Systems, Architecture
- Medical_Clean: Medicine, Health, Anatomy
- Warm_Humanities: Social Sciences, History, Arts
`;

        return `${baseInstruction}

Target Visual Style: ${style}
Generate the JSON design manifest now.
`;
    }
}
