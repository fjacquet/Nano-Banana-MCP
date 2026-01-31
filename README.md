# Nano-Banana MCP Server

An MCP server for AI image generation and editing using Google Gemini. Works with Claude Code, Cursor, and other MCP clients.

**Models supported:**
- **Nano Banana** (`gemini-2.5-flash-image`) — fast, efficient, default
- **Nano Banana Pro** (`gemini-3-pro-image-preview`) — professional quality with advanced reasoning

## Quick Start

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

2. Add to your MCP client config:
```json
{
  "mcpServers": {
    "nano-banana": {
      "command": "npx",
      "args": ["nano-banana-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-key-here"
      }
    }
  }
}
```

3. Use the tools:
```
Generate an image of a sunset over mountains
Edit this image to add some birds in the sky
Continue editing to make it more dramatic
```

## Tools

| Tool | Description |
|------|-------------|
| `generate_image` | Create new images from text prompts |
| `edit_image` | Modify existing images with optional reference images |
| `continue_editing` | Iteratively edit the last image |
| `get_last_image_info` | Get info about the last image |
| `configure_gemini_token` | Set API key |
| `get_configuration_status` | Check configuration |

All generation/editing tools accept an optional `model` parameter to choose between the two models.

See [docs/tools.md](docs/tools.md) for full API reference, [docs/configuration.md](docs/configuration.md) for setup details, and [docs/workflows.md](docs/workflows.md) for usage patterns.

## Development

```bash
npm install
npm run dev          # Run with tsx
npm run build        # Compile TypeScript
npm test             # Run tests
npm run lint         # Lint
npm run typecheck    # Type-check
```

Requires Node.js >= 18.0.0.

## License

MIT — see [LICENSE](LICENSE).

Fork of [ConechoAI/Nano-Banana-MCP](https://github.com/ConechoAI/Nano-Banana-MCP).
