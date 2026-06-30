import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = "https://api.openai.com/v1";

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get("app.ai.openaiApiKey") || "";
    this.model = this.config.get("app.ai.openaiModel") || "gpt-4o";
  }

  // ================================================================
  // 1. analyzeScene - Vision API (GPT-4o)
  // ================================================================
  async analyzeScene(
    imageBase64: string,
  ): Promise<{
    description: string;
    tags: string[];
    mood: string;
    characters: string[];
    techniques: string[];
    motionIntensity: number;
  }> {
    this.logger.log("Analyzing scene via Vision API...");

    if (!this.apiKey) {
      this.logger.warn("No OpenAI API key configured");
      return this.fallbackAnalysis();
    }

    try {
      const response = await fetch(this.baseUrl + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + this.apiKey,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: [
                "You are an expert anime and game video analyst.",
                "Analyze the given image/frame and respond in JSON:",
                JSON.stringify({
                  description: "Detailed scene description in Chinese",
                  characters: ["character names present"],
                  techniques: ["techniques or attacks visible"],
                  mood: "overall mood/atmosphere",
                  tags: ["5-10 keywords for search and matching"],
                  motionIntensity: 0.5,
                  colorPalette: ["dominant colors"],
                }),
              ].join("\n"),
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Describe this scene in detail." },
                {
                  type: "image_url",
                  image_url: {
                    url: "data:image/jpeg;base64," + imageBase64,
                    detail: "high",
                  },
                },
              ],
            },
          ],
          max_tokens: 1024,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error("Vision API error: " + response.status + " " + errorText);
        return this.fallbackAnalysis();
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);

      return {
        description: parsed.description || "",
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        mood: parsed.mood || "neutral",
        characters: Array.isArray(parsed.characters) ? parsed.characters : [],
        techniques: Array.isArray(parsed.techniques) ? parsed.techniques : [],
        motionIntensity: typeof parsed.motionIntensity === "number"
          ? Math.max(0, Math.min(1, parsed.motionIntensity))
          : 0.5,
      };
    } catch (error) {
      this.logger.error("Vision API call failed", (error as Error).stack);
      return this.fallbackAnalysis();
    }
  }

  // ================================================================
  // 2. transcribeAudio - Whisper API
  // ================================================================
  async transcribeAudio(
    audioFilePath: string,
  ): Promise<{
    text: string;
    segments: Array<{ start: number; end: number; text: string }>;
  }> {
    this.logger.log("Transcribing audio via Whisper API: " + audioFilePath);

    if (!this.apiKey) {
      this.logger.warn("No OpenAI API key configured");
      return { text: "", segments: [] };
    }

    try {
      if (!fs.existsSync(audioFilePath)) {
        this.logger.error("Audio file not found: " + audioFilePath);
        return { text: "", segments: [] };
      }

      const audioBuffer = fs.readFileSync(audioFilePath);
      const blob = new Blob([audioBuffer], { type: "audio/mpeg" });

      const formData = new FormData();
      formData.append("file", blob, path.basename(audioFilePath));
      formData.append("model", "whisper-1");
      formData.append("response_format", "verbose_json");
      formData.append("language", "zh");

      const response = await fetch(this.baseUrl + "/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error("Whisper API error: " + response.status + " " + errorText);
        return { text: "", segments: [] };
      }

      const data = await response.json() as any;

      return {
        text: data.text || "",
        segments: (data.segments || []).map((seg: any) => ({
          start: seg.start || 0,
          end: seg.end || 0,
          text: seg.text || "",
        })),
      };
    } catch (error) {
      this.logger.error("Whisper API call failed", (error as Error).stack);
      return { text: "", segments: [] };
    }
  }

  // ================================================================
  // 3. generateEmbedding - Text Embedding API
  // ================================================================
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey || !text.trim()) {
      return [];
    }

    try {
      const response = await fetch(this.baseUrl + "/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + this.apiKey,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: text,
        }),
      });

      if (!response.ok) {
        this.logger.error("Embedding API error: " + response.status);
        return [];
      }

      const data = await response.json() as any;
      return data.data?.[0]?.embedding || [];
    } catch (error) {
      this.logger.error("Embedding API call failed", (error as Error).stack);
      return [];
    }
  }

  // ================================================================
  // 4. matchScriptToMedia - Semantic matching using embeddings
  // ================================================================
  async matchScriptToMedia(
    scriptSegments: string[],
    mediaLibrary: any[],
  ): Promise<Array<{ scriptIndex: number; mediaId: string; score: number }>> {
    this.logger.log(
      "Matching " + scriptSegments.length + " segments to " + mediaLibrary.length + " media items",
    );

    if (scriptSegments.length === 0 || mediaLibrary.length === 0) {
      return [];
    }

    // Build text representations for each media item
    const mediaTexts = mediaLibrary.map((media) => {
      const parts: string[] = [];
      parts.push(media.analysis?.sceneDescription || "");
      parts.push(media.analysis?.transcription || "");
      parts.push((media.tags || []).map((t: any) => t.name).join(" "));
      parts.push(media.originalName || "");
      return parts.filter(Boolean).join(" ");
    });

    const results: Array<{ scriptIndex: number; mediaId: string; score: number }> = [];
    const usedMediaIds = new Set<string>();

    for (let i = 0; i < scriptSegments.length; i++) {
      const segment = scriptSegments[i];
      if (!segment.trim()) continue;

      try {
        // Generate embedding for this script segment
        const scriptEmbedding = await this.generateEmbedding(segment);
        if (scriptEmbedding.length === 0) continue;

        let bestMatch = { mediaId: "", score: -1 };

        for (let j = 0; j < mediaLibrary.length; j++) {
          const media = mediaLibrary[j];

          // Skip already-used media (prefer fresh)
          if (usedMediaIds.has(media.id) && j !== mediaLibrary.length - 1) continue;

          // Generate embedding for media text (cached or fresh)
          const mediaText = mediaTexts[j];
          if (!mediaText.trim()) continue;

          const mediaEmbedding = await this.generateEmbedding(mediaText.substring(0, 500));
          if (mediaEmbedding.length === 0) continue;

          // Cosine similarity
          const similarity = this.cosineSimilarity(scriptEmbedding, mediaEmbedding);
          if (similarity > bestMatch.score) {
            bestMatch = { mediaId: media.id, score: similarity };
          }
        }

        if (bestMatch.mediaId) {
          results.push({
            scriptIndex: i,
            mediaId: bestMatch.mediaId,
            score: bestMatch.score,
          });
          usedMediaIds.add(bestMatch.mediaId);
        }
      } catch (err) {
        this.logger.error("Match failed for segment " + i, (err as Error).message);
      }
    }

    // Sort by script index and then by score descending
    results.sort((a, b) => {
      if (a.scriptIndex !== b.scriptIndex) return a.scriptIndex - b.scriptIndex;
      return b.score - a.score;
    });

    return results;
  }

  // ================================================================
  // 5. Helper: suggestTransition
  // ================================================================
  async suggestTransition(
    previousSceneDescription: string,
    nextSceneDescription: string,
  ): Promise<{ transition: string; reason: string }> {
    if (!this.apiKey) {
      return { transition: "cut", reason: "Default (no API key)" };
    }

    try {
      const response = await fetch(this.baseUrl + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + this.apiKey,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: "Suggest a video transition between two scenes. " +
                "Options: cut, fade, dissolve, slide, wipe, zoom. " +
                "Respond in JSON: { transition: string, reason: string }",
            },
            {
              role: "user",
              content: "Previous scene: " + previousSceneDescription +
                "\nNext scene: " + nextSceneDescription,
            },
          ],
          max_tokens: 128,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        return { transition: "cut", reason: "API error, fallback to cut" };
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);
      return {
        transition: parsed.transition || "cut",
        reason: parsed.reason || "",
      };
    } catch (error) {
      this.logger.error("Transition suggestion failed", (error as Error).stack);
      return { transition: "cut", reason: "Error, fallback to cut" };
    }
  }

  // ================================================================
  // Helpers
  // ================================================================

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dotProduct = 0,
      normA = 0,
      normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dotProduct / denom;
  }

  private fallbackAnalysis() {
    return {
      description: "",
      tags: [],
      mood: "neutral",
      characters: [],
      techniques: [],
      motionIntensity: 0.5,
    };
  }

  async analyzeTemplateStyle(data: { totalDuration: number; shotCount: number; averageShotDuration: number; shotDurationDistribution: number[]; transitionTypes: Record<string, number> }): Promise<{
    averageShotDuration: number;
    shotDurationDistribution: number[];
    transitions: Array<{ type: string; timestamp: number }>;
    pacingScore: number;
    styleTags: string[];
  }> {
    this.logger.log("Analyzing template style (TODO)");
    return {
      averageShotDuration: 3.0,
      shotDurationDistribution: [],
      transitions: [],
      pacingScore: 5.0,
      styleTags: [],
    };
  }

  async detectBeats(audioFilePath: string): Promise<number[]> {
    this.logger.log("Beat detection (TODO)");
    return [];
  }
}