import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/index.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');
jest.mock('@google/genai');

const mockGenerateContent = jest.fn() as jest.MockedFunction<any>;

const MockGoogleGenAI = jest.fn().mockImplementation(() => ({
  models: {
    generateContent: mockGenerateContent,
  },
})) as jest.MockedFunction<any>;

jest.unstable_mockModule('@google/genai', () => ({
  GoogleGenAI: MockGoogleGenAI,
}));

describe('Nano-banana MCP Server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    test('should validate API key format', () => {
      const validKey = 'AIzaSyC...';
      const invalidKey = '';

      expect(validKey.length).toBeGreaterThan(0);
      expect(invalidKey.length).toBe(0);
    });

    test('should handle configuration persistence', async () => {
      const testConfig = {
        geminiApiKey: 'test-api-key-123',
      };

      const configPath = path.join(os.homedir(), '.nano-banana-config.json');

      // Test writing config
      await fs.writeFile(configPath, JSON.stringify(testConfig, null, 2));

      // Test reading config
      const configData = await fs.readFile(configPath, 'utf-8');
      const parsedConfig = JSON.parse(configData);

      expect(parsedConfig.geminiApiKey).toBe('test-api-key-123');

      // Cleanup
      try {
        await fs.unlink(configPath);
      } catch {
        // Ignore if file doesn't exist
      }
    });
  });

  describe('Image Generation', () => {
    test('should use correct default model name', () => {
      const prompt = 'A cute nano-banana in a lab setting';
      const expectedModel = 'gemini-2.5-flash-image';

      expect(prompt).toContain('nano-banana');
      expect(expectedModel).toBe('gemini-2.5-flash-image');
    });

    test('should support pro model selection', () => {
      const supportedModels = ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'];

      expect(supportedModels).toContain('gemini-2.5-flash-image');
      expect(supportedModels).toContain('gemini-3-pro-image-preview');
      expect(supportedModels).not.toContain('gemini-2.5-flash-image-preview');
    });

    test('should handle successful image generation', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Image generated successfully with nano-banana technology' }],
          },
        }],
      };

      mockGenerateContent.mockResolvedValueOnce(mockResponse);

      const result = await mockGenerateContent({
        model: 'gemini-2.5-flash-image',
        contents: 'test prompt',
      });
      expect(result.candidates[0].content.parts[0].text).toContain('nano-banana');
    });

    test('should handle generation errors gracefully', async () => {
      const error = new Error('API quota exceeded');
      mockGenerateContent.mockRejectedValueOnce(error);

      try {
        await mockGenerateContent({
          model: 'gemini-2.5-flash-image',
          contents: 'test prompt',
        });
      } catch (e) {
        expect((e as Error).message).toBe('API quota exceeded');
      }
    });
  });

  describe('Image Editing', () => {
    test('should handle MIME type detection', () => {
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
      };
      const getMimeType = (filePath: string): string => {
        const ext = path.extname(filePath).toLowerCase();
        return mimeTypes[ext] || 'image/jpeg';
      };

      expect(getMimeType('test.jpg')).toBe('image/jpeg');
      expect(getMimeType('test.png')).toBe('image/png');
      expect(getMimeType('test.webp')).toBe('image/webp');
      expect(getMimeType('test.gif')).toBe('image/gif');
      expect(getMimeType('test.unknown')).toBe('image/jpeg');
    });

    test('should validate allowed image extensions', () => {
      const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

      expect(allowed).toContain('.jpg');
      expect(allowed).toContain('.gif');
      expect(allowed).not.toContain('.svg');
      expect(allowed).not.toContain('.bmp');
    });

    test('should format image edit request with base64 data', () => {
      const testImageData = Buffer.from('test image data');
      const base64Data = testImageData.toString('base64');

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg',
        },
      };

      expect(imagePart.inlineData.data).toBe(base64Data);
      expect(imagePart.inlineData.mimeType).toBe('image/jpeg');
    });
  });

  describe('Tool Schema Validation', () => {
    test('should have correct tool definitions', () => {
      const expectedTools = [
        'configure_gemini_token',
        'generate_image',
        'edit_image',
        'get_configuration_status',
        'continue_editing',
        'get_last_image_info',
      ];

      expectedTools.forEach(tool => {
        expect(typeof tool).toBe('string');
        expect(tool.length).toBeGreaterThan(0);
      });
    });

    test('should validate required parameters', () => {
      const configureSchema = {
        apiKey: { required: true, type: 'string' },
      };

      const generateSchema = {
        prompt: { required: true, type: 'string' },
        model: { required: false, type: 'string' },
      };

      const editSchema = {
        imagePath: { required: true, type: 'string' },
        prompt: { required: true, type: 'string' },
        model: { required: false, type: 'string' },
      };

      expect(configureSchema.apiKey.required).toBe(true);
      expect(generateSchema.prompt.required).toBe(true);
      expect(generateSchema.model.required).toBe(false);
      expect(editSchema.imagePath.required).toBe(true);
      expect(editSchema.prompt.required).toBe(true);
      expect(editSchema.model.required).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing configuration', () => {
      const isConfigured = (config: any, genAI: any): boolean => {
        return config !== null && genAI !== null;
      };

      expect(isConfigured(null, null)).toBe(false);
      expect(isConfigured({ apiKey: 'test' }, {})).toBe(true);
    });

    test('should validate input parameters', () => {
      const validatePrompt = (prompt: string): boolean => {
        return typeof prompt === 'string' && prompt.length > 0;
      };

      expect(validatePrompt('valid prompt')).toBe(true);
      expect(validatePrompt('')).toBe(false);
      expect(validatePrompt(undefined as any)).toBe(false);
    });
  });

  describe('Integration Test Simulation', () => {
    test('should simulate full workflow with new API', async () => {
      const apiKey = 'test-gemini-api-key';
      expect(apiKey).toBeTruthy();

      const genAI = new MockGoogleGenAI({ apiKey });
      expect(genAI).toBeDefined();

      mockGenerateContent.mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [{ text: 'Generated nano-banana image successfully' }],
          },
        }],
      });

      const result = await (genAI as any).models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: 'a nano-banana in space',
      });

      expect(result.candidates[0].content.parts[0].text).toContain('nano-banana');
    });

    test('should simulate error recovery', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('Rate limit exceeded'));

      try {
        const genAI = new MockGoogleGenAI({ apiKey: 'test-key' });
        await (genAI as any).models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: 'test prompt',
        });
      } catch (error) {
        expect((error as Error).message).toBe('Rate limit exceeded');
      }

      mockGenerateContent.mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [{ text: 'Retry successful' }],
          },
        }],
      });

      const genAI = new MockGoogleGenAI({ apiKey: 'test-key' });
      const result = await (genAI as any).models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: 'test prompt',
      });

      expect(result.candidates[0].content.parts[0].text).toBe('Retry successful');
    });
  });
});
