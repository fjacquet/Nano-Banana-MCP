# Nano-Banana MCP Server

[![npm version](https://img.shields.io/npm/v/nano-banana-mcp.svg)](https://www.npmjs.com/package/nano-banana-mcp)
[![CI](https://github.com/fjacquet/Nano-Banana-MCP/actions/workflows/ci.yml/badge.svg)](https://github.com/fjacquet/Nano-Banana-MCP/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

An MCP server for AI image generation and editing using Google Gemini. Works with Claude Code, Cursor, and other MCP clients.

**Models supported:**

| Brand name | Model ID | Notes |
|---|---|---|
| **Nano Banana 2** | `gemini-3.1-flash-image` | Default — pro quality at Flash speed |
| **Nano Banana Pro** | `gemini-3-pro-image` | Highest quality, advanced reasoning |
| **Nano Banana** | `gemini-2.5-flash-image` | Legacy — fast, efficient |

## Quick Start

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

2. Add to your MCP client config (Claude Code example):
```json
{
  "mcpServers": {
    "nano-banana": {
      "command": "npx",
      "args": ["-y", "github:fjacquet/Nano-Banana-MCP"],
      "env": {
        "GEMINI_API_KEY": "your-key-here"
      }
    }
  }
}
```

> See [docs/configuration.md](docs/configuration.md) for Cursor and other MCP clients.

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
