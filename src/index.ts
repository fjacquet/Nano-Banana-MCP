#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolRequest,
  CallToolResult,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { config as dotenvConfig } from "dotenv";
import os from "os";

dotenvConfig();

const DEFAULT_MODEL = "gemini-2.5-flash-image";
const SUPPORTED_MODELS = [DEFAULT_MODEL, "gemini-3-pro-image-preview"] as const;
type SupportedModel = typeof SUPPORTED_MODELS[number];

const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

const CONFIG_FILE_NAME = ".nano-banana-config.json";

const ConfigSchema = z.object({
  geminiApiKey: z.string().min(1, "Gemini API key is required"),
});

type Config = z.infer<typeof ConfigSchema>;

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

class NanoBananaMCP {
  private server: Server;
  private genAI: GoogleGenAI | null = null;
  private config: Config | null = null;
  private lastImagePath: string | null = null;
  private configSource: "environment" | "config_file" | "not_configured" =
    "not_configured";

  constructor() {
    this.server = new Server(
      {
        name: "nano-banana-mcp",
        version: "2.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "configure_gemini_token",
            description:
              "Configure your Gemini API token for nano-banana image generation",
            inputSchema: {
              type: "object",
              properties: {
                apiKey: {
                  type: "string",
                  description: "Your Gemini API key from Google AI Studio",
                },
              },
              required: ["apiKey"],
            },
          },
          {
            name: "generate_image",
            description:
              "Generate a NEW image from text prompt. Use this ONLY when creating a completely new image, not when modifying an existing one.",
            inputSchema: {
              type: "object",
              properties: {
                prompt: {
                  type: "string",
                  description:
                    "Text prompt describing the NEW image to create from scratch",
                },
                model: {
                  type: "string",
                  enum: SUPPORTED_MODELS,
                  description: `Model to use. "${DEFAULT_MODEL}" (default, fast) or "gemini-3-pro-image-preview" (pro, higher quality)`,
                },
              },
              required: ["prompt"],
            },
          },
          {
            name: "edit_image",
            description:
              "Edit a SPECIFIC existing image file, optionally using additional reference images. Use this when you have the exact file path of an image to modify.",
            inputSchema: {
              type: "object",
              properties: {
                imagePath: {
                  type: "string",
                  description: "Full file path to the main image file to edit",
                },
                prompt: {
                  type: "string",
                  description:
                    "Text describing the modifications to make to the existing image",
                },
                referenceImages: {
                  type: "array",
                  items: { type: "string" },
                  description:
                    "Optional array of file paths to additional reference images to use during editing (e.g., for style transfer, adding elements, etc.)",
                },
                model: {
                  type: "string",
                  enum: SUPPORTED_MODELS,
                  description: `Model to use. "${DEFAULT_MODEL}" (default, fast) or "gemini-3-pro-image-preview" (pro, higher quality)`,
                },
              },
              required: ["imagePath", "prompt"],
            },
          },
          {
            name: "get_configuration_status",
            description: "Check if Gemini API token is configured",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
          },
          {
            name: "continue_editing",
            description:
              "Continue editing the LAST image that was generated or edited in this session, optionally using additional reference images. Use this for iterative improvements.",
            inputSchema: {
              type: "object",
              properties: {
                prompt: {
                  type: "string",
                  description:
                    "Text describing the modifications to make to the last image",
                },
                referenceImages: {
                  type: "array",
                  items: { type: "string" },
                  description:
                    "Optional array of file paths to additional reference images",
                },
                model: {
                  type: "string",
                  enum: SUPPORTED_MODELS,
                  description: `Model to use. "${DEFAULT_MODEL}" (default, fast) or "gemini-3-pro-image-preview" (pro, higher quality)`,
                },
              },
              required: ["prompt"],
            },
          },
          {
            name: "get_last_image_info",
            description:
              "Get information about the last generated/edited image in this session.",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
          },
        ] as Tool[],
      };
    });

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request: CallToolRequest): Promise<CallToolResult> => {
        try {
          switch (request.params.name) {
            case "configure_gemini_token":
              return await this.configureGeminiToken(request);
            case "generate_image":
              return await this.generateImage(request);
            case "edit_image":
              return await this.editImage(request);
            case "get_configuration_status":
              return await this.getConfigurationStatus();
            case "continue_editing":
              return await this.continueEditing(request);
            case "get_last_image_info":
              return await this.getLastImageInfo();
            default:
              throw new McpError(
                ErrorCode.MethodNotFound,
                `Unknown tool: ${request.params.name}`
              );
          }
        } catch (error) {
          if (error instanceof McpError) throw error;
          throw new McpError(
            ErrorCode.InternalError,
            `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    );
  }

  // --- Validation helpers ---

  private async validateImagePath(filePath: string): Promise<void> {
    const resolved = path.resolve(filePath);
    const ext = path.extname(resolved).toLowerCase();

    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Unsupported image format "${ext}". Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(", ")}`
      );
    }

    let stats;
    try {
      stats = await fs.stat(resolved);
    } catch {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Image file not found: ${filePath}`
      );
    }

    if (stats.size > MAX_IMAGE_SIZE_BYTES) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Image file too large (${Math.round(stats.size / 1024 / 1024)}MB). Maximum: ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB`
      );
    }
  }

  private resolveModel(model?: string): SupportedModel {
    if (!model) return DEFAULT_MODEL;
    if (SUPPORTED_MODELS.includes(model as SupportedModel)) {
      return model as SupportedModel;
    }
    throw new McpError(
      ErrorCode.InvalidParams,
      `Unsupported model "${model}". Supported: ${SUPPORTED_MODELS.join(", ")}`
    );
  }

  // --- Shared response builder (DRY) ---

  private async buildImageResponse(
    response: { candidates?: Array<{ content?: { parts?: Array<{ text?: string; inlineData?: { data?: string; mimeType?: string } }> } }> },
    prefix: string,
    promptText: string,
    warnings: string[]
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
          const saved = await this.saveImage(imagesDir, prefix, part.inlineData.data);
          savedFiles.push(saved.filePath);
          this.lastImagePath = saved.filePath;

          content.push({
            type: "image" as const,
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType || "image/png",
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
    base64Data: string
  ): Promise<SavedImage> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileName = `${prefix}-${timestamp}-${randomId}.png`;
    const filePath = path.join(imagesDir, fileName);

    const imageBuffer = Buffer.from(base64Data, "base64");
    await fs.writeFile(filePath, imageBuffer);

    return { filePath, base64: base64Data, mimeType: "image/png" };
  }

  // --- Tool implementations ---

  private async configureGeminiToken(
    request: CallToolRequest
  ): Promise<CallToolResult> {
    const { apiKey } = request.params.arguments as { apiKey: string };

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
          `Invalid API key: ${error.errors[0]?.message}`
        );
      }
      throw error;
    }
  }

  private async generateImage(
    request: CallToolRequest
  ): Promise<CallToolResult> {
    if (!this.ensureConfigured()) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Gemini API token not configured. Use configure_gemini_token first."
      );
    }

    const { prompt, model } = request.params.arguments as {
      prompt: string;
      model?: string;
    };
    const resolvedModel = this.resolveModel(model);

    try {
      const response = await this.genAI!.models.generateContent({
        model: resolvedModel,
        contents: prompt,
      });

      return await this.buildImageResponse(
        response,
        "generated",
        prompt,
        []
      );
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to generate image: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async editImage(
    request: CallToolRequest
  ): Promise<CallToolResult> {
    if (!this.ensureConfigured()) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Gemini API token not configured. Use configure_gemini_token first."
      );
    }

    const { imagePath, prompt, referenceImages, model } = request.params
      .arguments as {
      imagePath: string;
      prompt: string;
      referenceImages?: string[];
      model?: string;
    };
    const resolvedModel = this.resolveModel(model);

    await this.validateImagePath(imagePath);

    try {
      const imageBuffer = await fs.readFile(imagePath);
      const mimeType = this.getMimeType(imagePath);

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
            await this.validateImagePath(refPath);
            const refBuffer = await fs.readFile(refPath);
            imageParts.push({
              inlineData: {
                data: refBuffer.toString("base64"),
                mimeType: this.getMimeType(refPath),
              },
            });
          } catch (error) {
            warnings.push(
              `Skipped reference image "${refPath}": ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      }

      imageParts.push({ text: prompt });

      const response = await this.genAI!.models.generateContent({
        model: resolvedModel,
        contents: [{ parts: imageParts }],
      });

      let statusPrefix = `Image edited with nano-banana!\n\nOriginal: ${imagePath}\nEdit prompt: "${prompt}"`;
      if (referenceImages && referenceImages.length > 0) {
        statusPrefix += `\n\nReference images:\n${referenceImages.map((f) => `- ${f}`).join("\n")}`;
      }

      return await this.buildImageResponse(
        response,
        "edited",
        prompt,
        warnings
      );
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to edit image: ${error instanceof Error ? error.message : String(error)}`
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
    request: CallToolRequest
  ): Promise<CallToolResult> {
    if (!this.ensureConfigured()) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Gemini API token not configured. Use configure_gemini_token first."
      );
    }

    if (!this.lastImagePath) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "No previous image found. Please generate or edit an image first."
      );
    }

    try {
      await fs.access(this.lastImagePath);
    } catch {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Last image file not found at: ${this.lastImagePath}. Please generate a new image first.`
      );
    }

    const { prompt, referenceImages, model } = request.params.arguments as {
      prompt: string;
      referenceImages?: string[];
      model?: string;
    };

    return await this.editImage({
      method: "tools/call",
      params: {
        name: "edit_image",
        arguments: {
          imagePath: this.lastImagePath,
          prompt,
          referenceImages,
          model,
        },
      },
    } as CallToolRequest);
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

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
    };
    return mimeTypes[ext] || "image/jpeg";
  }

  private getImagesDirectory(): string {
    const platform = os.platform();

    if (platform === "win32") {
      return path.join(os.homedir(), "Documents", "nano-banana-images");
    }

    const cwd = process.cwd();
    if (
      cwd.startsWith("/usr/") ||
      cwd.startsWith("/opt/") ||
      cwd.startsWith("/var/")
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
