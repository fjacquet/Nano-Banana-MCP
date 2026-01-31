# Configuration

## API Key Setup

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Configure using one of the methods below

## Configuration Priority

The server loads your API key in this order:

1. **MCP environment variables** (highest priority) — set in your MCP client config
2. **System environment variable** — `GEMINI_API_KEY`
3. **Config file** — `~/.nano-banana-config.json` (created via `configure_gemini_token` tool)

## Claude Code

**With environment variable (recommended):**
```json
{
  "mcpServers": {
    "nano-banana": {
      "command": "npx",
      "args": ["nano-banana-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-gemini-api-key-here"
      }
    }
  }
}
```

**Without environment variable:**
```json
{
  "mcpServers": {
    "nano-banana": {
      "command": "npx",
      "args": ["nano-banana-mcp"]
    }
  }
}
```

## Cursor

**With environment variable (recommended):**
```json
{
  "nano-banana": {
    "command": "npx",
    "args": ["nano-banana-mcp"],
    "env": {
      "GEMINI_API_KEY": "your-gemini-api-key-here"
    }
  }
}
```

**Without environment variable:**
```json
{
  "nano-banana": {
    "command": "npx",
    "args": ["nano-banana-mcp"]
  }
}
```

## Other MCP Clients

**System environment variable:**
```bash
export GEMINI_API_KEY="your-gemini-api-key-here"
npx nano-banana-mcp
```

**Using the configure tool:**
```bash
npx nano-banana-mcp
# Then use configure_gemini_token tool to set your key
# Saves to ~/.nano-banana-config.json
```

## Model Selection

Two models are available:

| Model | ID | Use Case |
|-------|-----|----------|
| **Nano Banana** | `gemini-2.5-flash-image` | Fast, efficient — default for all tools |
| **Nano Banana Pro** | `gemini-3-pro-image-preview` | Professional quality, advanced reasoning |

Pass the `model` parameter to any generation/editing tool to select the model.

## File Storage

Images are saved to platform-appropriate locations:

- **Windows**: `%USERPROFILE%\Documents\nano-banana-images\`
- **macOS/Linux**: `./generated_imgs/` (in current directory)
- **System directories**: `~/nano-banana-images/` (when run from system paths)

File naming: `generated-[timestamp]-[id].png` or `edited-[timestamp]-[id].png`
