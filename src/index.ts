#!/usr/bin/env node

import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  type CallToolResult,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { buildGenerationConfig, VALID_PRESETS } from "./generation-config.js";
import { extensionForMimeType, mimeTypeForPath } from "./image-mime.js";
import { validateImagePath } from "./image-path.js";

const { version: PACKAGE_VERSION } = createRequire(import.meta.url)(
  "../package.json",
) as { version: string };

const DEFAULT_MODEL = "gemini-nano-banana-2.1";
const SUPPORTED_MODELS = [
  DEFAULT_MODEL,
  "gemini-3.1-flash-image",
  "gemini-3.1-flash-lite-image",
  "gemini-2.5-flash-image",
  "gemini-3-pro-image",
] as const;
type SupportedModel = (typeof SUPPORTED_MODELS)[number];

const VALID_ASPECT_RATIOS = [
  "1:1",
  "1:4",
  "1:8",
  "2:3",
  "3:2",
  "3:4",
  "4:1",
  "4:3",
  "4:5",
  "5:4",
  "8:1",
  "9:16",
  "16:9",
  "21:9",
] as const;
const VALID_IMAGE_SIZES = ["512px", "1K", "2K", "4K"] as const;
const VALID_THINKING_LEVELS = ["minimal", "medium", "high"] as const;

const CONFIG_FILE_NAME = ".nano-banana-config.json";

const ConfigSchema = z.object({
  geminiApiKey: z.string().min(1, "Gemini API key is required"),
});

type Config = z.infer<typeof ConfigSchema>;

const MODEL_DESCRIPTION = `Model to use. "${DEFAULT_MODEL}" (default, Nano Banana 2.1 — pro quality at Flash speed), "gemini-3.1-flash-image" (Nano Banana 2, previous default), "gemini-3.1-flash-lite-image" (Nano Banana 2 Lite — fastest and cheapest, 1K output only), "gemini-2.5-flash-image" (legacy fast), or "gemini-3-pro-image" (Nano Banana Pro, highest quality)`;

const ModelOpt = z
  .enum(SUPPORTED_MODELS)
  .optional()
  .describe(MODEL_DESCRIPTION);
const PresetOpt = z
  .enum(VALID_PRESETS)
  .optional()
  .describe(
    `Shape by use: "web" (16:9 landscape), "phone" (9:16 portrait), "square" (1:1). Overridden by aspectRatio when both are given. Size is set with imageSize.`,
  );
const AspectRatioOpt = z
  .enum(VALID_ASPECT_RATIOS)
  .optional()
  .describe(
    `Aspect ratio of the output image. Omit to let the model choose: new images usually come out landscape (about 16:9) and edits keep the source image's shape. Pass "1:1" for a square image.`,
  );
const ImageSizeOpt = z
  .enum(VALID_IMAGE_SIZES)
  .optional()
  .describe(
    `Resolution of the output image. Default: "1K". Use "2K" or "4K" for high-resolution output.`,
  );

const ThinkingLevelOpt = z
  .enum(VALID_THINKING_LEVELS)
  .optional()
  .describe(
    `How much the model reasons before drawing. "minimal" is fastest and cheapest; "high" is best for complex prompts (infographics, text in images, several consistent characters). Default: the model's own ("medium" on "${DEFAULT_MODEL}"). "gemini-3.1-flash-image" and "gemini-3.1-flash-lite-image" accept only "minimal" or "high"; "gemini-2.5-flash-image" does not support thinking levels.`,
  );

const GROUNDING_MODEL: SupportedModel = "gemini-3-pro-image";

const UseGoogleSearchOpt = z
  .boolean()
  .optional()
  .describe(
    `Enable Google Search grounding for fact-aware image generation. Only supported on "${GROUNDING_MODEL}".`,
  );

const ConfigureGeminiShape = {
  apiKey: z
    .string()
    .min(1)
    .describe("Your Gemini API key from Google AI Studio"),
};

const GenerateImageShape = {
  prompt: z
    .string()
    .describe("Text prompt describing the NEW image to create from scratch"),
  model: ModelOpt,
  preset: PresetOpt,
  aspectRatio: AspectRatioOpt,
  imageSize: ImageSizeOpt,
  useGoogleSearch: UseGoogleSearchOpt,
  thinkingLevel: ThinkingLevelOpt,
};

const EditImageShape = {
  imagePath: z
    .string()
    .describe("Full file path to the main image file to edit"),
  prompt: z
    .string()
    .describe(
      "Text describing the modifications to make to the existing image",
    ),
  referenceImages: z
    .array(z.string())
    .optional()
    .describe(
      "Optional array of file paths to additional reference images to use during editing (e.g., for style transfer, adding elements, etc.)",
    ),
  model: ModelOpt,
  preset: PresetOpt,
  aspectRatio: AspectRatioOpt,
  imageSize: ImageSizeOpt,
  useGoogleSearch: UseGoogleSearchOpt,
  thinkingLevel: ThinkingLevelOpt,
};

const ContinueEditingShape = {
  prompt: z
    .string()
    .describe("Text describing the modifications to make to the last image"),
  referenceImages: z
    .array(z.string())
    .optional()
    .describe("Optional array of file paths to additional reference images"),
  model: ModelOpt,
  preset: PresetOpt,
  aspectRatio: AspectRatioOpt,
  imageSize: ImageSizeOpt,
  useGoogleSearch: UseGoogleSearchOpt,
  thinkingLevel: ThinkingLevelOpt,
};

interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

interface TextPart {
  text: string;
}

type ContentPart = ImagePart | TextPart;

interface SavedImage {
  filePath: string;
  base64: string;
  mimeType: string;
}

type GenerateImageArgs = z.infer<z.ZodObject<typeof GenerateImageShape>>;
type EditImageArgs = z.infer<z.ZodObject<typeof EditImageShape>>;
type ContinueEditingArgs = z.infer<z.ZodObject<typeof ContinueEditingShape>>;

class NanoBananaMCP {
  private server: McpServer;
  private genAI: GoogleGenAI | null = null;
  private config: Config | null = null;
  private lastImagePath: string | null = null;
  private configSource: "environment" | "config_file" | "not_configured" =
    "not_configured";

  constructor() {
    this.server = new McpServer({
      name: "nano-banana-mcp",
      version: PACKAGE_VERSION,
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.registerTool(
      "configure_gemini_token",
      {
        description:
          "Configure your Gemini API token for nano-banana image generation",
        inputSchema: ConfigureGeminiShape,
      },
      async ({ apiKey }) => this.configureGeminiToken(apiKey),
    );

    this.server.registerTool(
      "generate_image",
      {
        description:
          "Generate a NEW image from text prompt. Use this ONLY when creating a completely new image, not when modifying an existing one.",
        inputSchema: GenerateImageShape,
      },
      async (args) => this.generateImage(args),
    );

    this.server.registerTool(
      "edit_image",
      {
        description:
          "Edit a SPECIFIC existing image file, optionally using additional reference images. Use this when you have the exact file path of an image to modify.",
        inputSchema: EditImageShape,
      },
      async (args) => this.editImage(args),
    );

    this.server.registerTool(
      "get_configuration_status",
      {
        description: "Check if Gemini API token is configured",
        inputSchema: {},
      },
      async () => this.getConfigurationStatus(),
    );

    this.server.registerTool(
      "continue_editing",
      {
        description:
          "Continue editing the LAST image that was generated or edited in this session, optionally using additional reference images. Use this for iterative improvements.",
        inputSchema: ContinueEditingShape,
      },
      async (args) => this.continueEditing(args),
    );

    this.server.registerTool(
      "get_last_image_info",
      {
        description:
          "Get information about the last generated/edited image in this session.",
        inputSchema: {},
      },
      async () => this.getLastImageInfo(),
    );
  }

  // --- Validation helpers ---

  private resolveModel(model?: string): SupportedModel {
    if (!model) return DEFAULT_MODEL;
    if (SUPPORTED_MODELS.includes(model as SupportedModel)) {
      return model as SupportedModel;
    }
    throw new McpError(
      ErrorCode.InvalidParams,
      `Unsupported model "${model}". Supported: ${SUPPORTED_MODELS.join(", ")}`,
    );
  }

  // --- Shared response builder (DRY) ---

  private async buildImageResponse(
    response: {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
            inlineData?: { data?: string; mimeType?: string };
          }>;
        };
      }>;
    },
    prefix: string,
    promptText: string,
    warnings: string[],
  ): Promise<CallToolResult> {
    const content: CallToolResult["content"] = [];
    const savedFiles: string[] = [];
    let textContent = "";

    const imagesDir = this.getImagesDirectory();
    await fs.mkdir(imagesDir, { recursive: true, mode: 0o755 });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          textContent += part.text;
        }

        if (part.inlineData?.data) {
          const saved = await this.saveImage(
            imagesDir,
            prefix,
            part.inlineData.data,
            part.inlineData.mimeType,
          );
          savedFiles.push(saved.filePath);
          this.lastImagePath = saved.filePath;

          content.push({
            type: "image" as const,
            data: part.inlineData.data,
            mimeType: saved.mimeType,
          });
        }
      }
    }

    let statusText = `Image ${prefix === "generated" ? "generated" : "edited"} with nano-banana!\n\nPrompt: "${promptText}"`;

    if (textContent) {
      statusText += `\n\nDescription: ${textContent}`;
    }

    if (warnings.length > 0) {
      statusText += `\n\nWarnings:\n${warnings.map((w) => `- ${w}`).join("\n")}`;
    }

    if (savedFiles.length > 0) {
      statusText += `\n\nImage saved to:\n${savedFiles.map((f) => `- ${f}`).join("\n")}`;
      statusText += `\n\nTo modify this image, use: continue_editing`;
      statusText += `\nTo check current image info, use: get_last_image_info`;
    } else {
      statusText += `\n\nNote: No image was generated. The model may have returned only text.`;
    }

    content.unshift({ type: "text" as const, text: statusText });

    return { content };
  }

  private async saveImage(
    imagesDir: string,
    prefix: string,
    base64Data: string,
    mimeType?: string,
  ): Promise<SavedImage> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileName = `${prefix}-${timestamp}-${randomId}${extensionForMimeType(mimeType)}`;
    const filePath = path.join(imagesDir, fileName);

    const imageBuffer = Buffer.from(base64Data, "base64");
    await fs.writeFile(filePath, imageBuffer);

    return { filePath, base64: base64Data, mimeType: mimeType || "image/png" };
  }

  // --- Tool implementations ---

  private async configureGeminiToken(apiKey: string): Promise<CallToolResult> {
    try {
      ConfigSchema.parse({ geminiApiKey: apiKey });

      this.config = { geminiApiKey: apiKey };
      this.genAI = new GoogleGenAI({ apiKey });
      this.configSource = "config_file";

      await this.saveConfig();

      return {
        content: [
          {
            type: "text",
            text: "Gemini API token configured successfully. You can now use nano-banana image generation features.",
          },
        ],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid API key: ${error.issues[0]?.message}`,
        );
      }
      throw error;
    }
  }

  private async generateImage(
    args: GenerateImageArgs,
  ): Promise<CallToolResult> {
    if (!this.ensureConfigured()) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Gemini API token not configured. Use configure_gemini_token first.",
      );
    }

    const {
      prompt,
      model,
      preset,
      aspectRatio,
      imageSize,
      useGoogleSearch,
      thinkingLevel,
    } = args;
    const resolvedModel = this.resolveModel(model);

    if (useGoogleSearch && resolvedModel !== GROUNDING_MODEL) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Google Search grounding requires model "${GROUNDING_MODEL}" but got "${resolvedModel}".`,
      );
    }

    try {
      const config = buildGenerationConfig({
        preset,
        aspectRatio,
        imageSize,
        useGoogleSearch,
        thinkingLevel,
      });

      const response = await this.genAI!.models.generateContent({
        model: resolvedModel,
        contents: prompt,
        ...(config && { config }),
      });

      return await this.buildImageResponse(response, "generated", prompt, []);
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to generate image: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async editImage(args: EditImageArgs): Promise<CallToolResult> {
    if (!this.ensureConfigured()) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Gemini API token not configured. Use configure_gemini_token first.",
      );
    }

    const {
      imagePath,
      prompt,
      referenceImages,
      model,
      preset,
      aspectRatio,
      imageSize,
      useGoogleSearch,
      thinkingLevel,
    } = args;
    const resolvedModel = this.resolveModel(model);

    if (useGoogleSearch && resolvedModel !== GROUNDING_MODEL) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Google Search grounding requires model "${GROUNDING_MODEL}" but got "${resolvedModel}".`,
      );
    }

    await validateImagePath(imagePath);

    try {
      const imageBuffer = await fs.readFile(imagePath);
      const mimeType = mimeTypeForPath(imagePath);

      const imageParts: ContentPart[] = [
        {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType,
          },
        },
      ];

      // Load reference images, collecting warnings for failures
      const warnings: string[] = [];
      if (referenceImages && referenceImages.length > 0) {
        for (const refPath of referenceImages) {
          try {
            await validateImagePath(refPath);
            const refBuffer = await fs.readFile(refPath);
            imageParts.push({
              inlineData: {
                data: refBuffer.toString("base64"),
                mimeType: mimeTypeForPath(refPath),
              },
            });
          } catch (error) {
            warnings.push(
              `Skipped reference image "${refPath}": ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }

      imageParts.push({ text: prompt });

      const config = buildGenerationConfig({
        preset,
        aspectRatio,
        imageSize,
        useGoogleSearch,
        thinkingLevel,
      });

      const response = await this.genAI!.models.generateContent({
        model: resolvedModel,
        contents: [{ parts: imageParts }],
        ...(config && { config }),
      });

      return await this.buildImageResponse(
        response,
        "edited",
        prompt,
        warnings,
      );
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to edit image: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async getConfigurationStatus(): Promise<CallToolResult> {
    const isConfigured = this.config !== null && this.genAI !== null;

    let statusText: string;
    let sourceInfo = "";

    if (isConfigured) {
      statusText = "Gemini API token is configured and ready to use";

      switch (this.configSource) {
        case "environment":
          sourceInfo =
            "\nSource: Environment variable (GEMINI_API_KEY)\nThis is the most secure configuration method.";
          break;
        case "config_file":
          sourceInfo =
            "\nSource: Local configuration file (.nano-banana-config.json)\nConsider using environment variables for better security.";
          break;
      }
    } else {
      statusText = "Gemini API token is not configured";
      sourceInfo = `

Configuration options (in priority order):
1. MCP client environment variables (Recommended)
2. System environment variable: GEMINI_API_KEY
3. Use configure_gemini_token tool

For the most secure setup, add this to your MCP configuration:
"env": { "GEMINI_API_KEY": "your-api-key-here" }`;
    }

    return {
      content: [{ type: "text", text: statusText + sourceInfo }],
    };
  }

  private async continueEditing(
    args: ContinueEditingArgs,
  ): Promise<CallToolResult> {
    if (!this.ensureConfigured()) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Gemini API token not configured. Use configure_gemini_token first.",
      );
    }

    if (!this.lastImagePath) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "No previous image found. Please generate or edit an image first.",
      );
    }

    try {
      await fs.access(this.lastImagePath);
    } catch {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Last image file not found at: ${this.lastImagePath}. Please generate a new image first.`,
      );
    }

    return await this.editImage({
      imagePath: this.lastImagePath,
      ...args,
    });
  }

  private async getLastImageInfo(): Promise<CallToolResult> {
    if (!this.lastImagePath) {
      return {
        content: [
          {
            type: "text",
            text: "No previous image found.\n\nPlease generate or edit an image first.",
          },
        ],
      };
    }

    try {
      await fs.access(this.lastImagePath);
      const stats = await fs.stat(this.lastImagePath);

      return {
        content: [
          {
            type: "text",
            text: `Last Image Information:\n\nPath: ${this.lastImagePath}\nFile Size: ${Math.round(stats.size / 1024)} KB\nLast Modified: ${stats.mtime.toLocaleString()}\n\nUse continue_editing to make further changes.`,
          },
        ],
      };
    } catch {
      return {
        content: [
          {
            type: "text",
            text: `Last Image Information:\n\nPath: ${this.lastImagePath}\nStatus: File not found\n\nThe image file may have been moved or deleted. Please generate a new image.`,
          },
        ],
      };
    }
  }

  // --- Utilities ---

  private ensureConfigured(): boolean {
    return this.config !== null && this.genAI !== null;
  }

  private getImagesDirectory(): string {
    const platform = os.platform();

    if (platform === "win32") {
      return path.join(os.homedir(), "Documents", "nano-banana-images");
    }

    const cwd = process.cwd();
    if (
      cwd === "/" ||
      cwd.startsWith("/usr/") ||
      cwd.startsWith("/opt/") ||
      cwd.startsWith("/var/") ||
      cwd.startsWith("/tmp/")
    ) {
      return path.join(os.homedir(), "nano-banana-images");
    }

    return path.join(cwd, "generated_imgs");
  }

  private getConfigPath(): string {
    return path.join(os.homedir(), CONFIG_FILE_NAME);
  }

  private async saveConfig(): Promise<void> {
    if (!this.config) return;
    const configPath = this.getConfigPath();
    await fs.writeFile(configPath, JSON.stringify(this.config, null, 2), {
      mode: 0o600,
    });
  }

  private async loadConfig(): Promise<void> {
    // Priority 1: environment variable
    const envApiKey = process.env.GEMINI_API_KEY;
    if (envApiKey) {
      try {
        this.config = ConfigSchema.parse({ geminiApiKey: envApiKey });
        this.genAI = new GoogleGenAI({ apiKey: this.config.geminiApiKey });
        this.configSource = "environment";
        return;
      } catch {
        // Invalid API key in environment, fall through
      }
    }

    // Priority 2: config file in home directory
    try {
      const configPath = this.getConfigPath();
      const configData = await fs.readFile(configPath, "utf-8");
      const parsedConfig = JSON.parse(configData);

      this.config = ConfigSchema.parse(parsedConfig);
      this.genAI = new GoogleGenAI({ apiKey: this.config.geminiApiKey });
      this.configSource = "config_file";
    } catch {
      this.configSource = "not_configured";
    }
  }

  public async run(): Promise<void> {
    await this.loadConfig();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new NanoBananaMCP();
server.run().catch(console.error);
