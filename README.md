# Nano-Banana MCP Server

[![CI](https://github.com/fjacquet/Nano-Banana-MCP/actions/workflows/ci.yml/badge.svg)](https://github.com/fjacquet/Nano-Banana-MCP/actions/workflows/ci.yml)
[![Security](https://github.com/fjacquet/Nano-Banana-MCP/actions/workflows/security.yml/badge.svg)](https://github.com/fjacquet/Nano-Banana-MCP/actions/workflows/security.yml)
[![Docs](https://github.com/fjacquet/Nano-Banana-MCP/actions/workflows/docs.yml/badge.svg)](https://fjacquet.github.io/Nano-Banana-MCP/)
[![Release](https://github.com/fjacquet/Nano-Banana-MCP/actions/workflows/release.yml/badge.svg)](https://github.com/fjacquet/Nano-Banana-MCP/actions/workflows/release.yml)
[![npm version](https://img.shields.io/npm/v/@fjacquet/nano-banana-mcp.svg)](https://www.npmjs.com/package/@fjacquet/nano-banana-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@fjacquet/nano-banana-mcp.svg)](https://www.npmjs.com/package/@fjacquet/nano-banana-mcp)
[![GitHub release](https://img.shields.io/github/v/release/fjacquet/Nano-Banana-MCP?sort=semver)](https://github.com/fjacquet/Nano-Banana-MCP/releases/latest)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-io.github.fjacquet%2Fnano--banana--mcp-blue)](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.fjacquet/nano-banana-mcp)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/github/license/fjacquet/Nano-Banana-MCP)](LICENSE)

An MCP server for AI image generation and editing using Google Gemini. Works with Claude Code, Cursor, and other MCP clients.

> Independent project, forked from [ConechoAI/Nano-Banana-MCP](https://github.com/ConechoAI/Nano-Banana-MCP) and since rewritten in TypeScript. It is published as [`@fjacquet/nano-banana-mcp`](https://www.npmjs.com/package/@fjacquet/nano-banana-mcp), not as the upstream `nano-banana-mcp` package.

## What differs from upstream

- Five Gemini models (default Nano Banana 2.1) instead of Gemini 2.5 Flash Image only
- Image options: aspect ratio, `preset` shapes, resolution, thinking level, Google Search grounding
- Image path validation (allowed extensions, 20MB limit, allowed roots) with unit tests
- Built on the MCP SDK `McpServer` with Zod-validated tool inputs
- Automated CI, CodeQL and OSV security scans, docs site, and npm publishing with provenance via OIDC
- Listed on the official MCP Registry

**Documentation:** <https://fjacquet.github.io/Nano-Banana-MCP/>

## Models

| Brand name | Model ID | Notes |
|---|---|---|
| **Nano Banana 2.1** | `gemini-nano-banana-2.1` | Default — pro quality at Flash speed |
| **Nano Banana Pro** | `gemini-3-pro-image` | Highest quality, advanced reasoning |
| **Nano Banana 2** | `gemini-3.1-flash-image` | Previous default |
| **Nano Banana 2 Lite** | `gemini-3.1-flash-lite-image` | Fastest and cheapest — 1K output only, no Google Search grounding |
| **Nano Banana** | `gemini-2.5-flash-image` | Legacy — shut down by Google on 2027-03-15 |

## Quick Start

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

2. Add to your MCP client config (Claude Code example):
```json
{
  "mcpServers": {
    "nano-banana": {
      "command": "npx",
      "args": ["-y", "@fjacquet/nano-banana-mcp"],
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

The three generation/editing tools accept these optional parameters:

| Option | Purpose |
|--------|---------|
| `model` | Pick one of the models above |
| `aspectRatio` / `preset` | Output shape; `preset` is `web`, `phone`, `webconf`, `banner` or `square` |
| `imageSize` | Output resolution |
| `useGoogleSearch` | Google Search grounding; the queries run are listed in the output |
| `thinkingLevel` | Reasoning effort |

See [docs/tools.md](docs/tools.md) for the full API reference, [docs/configuration.md](docs/configuration.md) for setup details, and [docs/workflows.md](docs/workflows.md) for usage patterns.

## Development

```bash
npm install
npm run dev          # Run with tsx
npm run build        # Compile TypeScript
npm test             # Jest unit tests
npm run lint         # Biome lint
npm run typecheck    # Type-check
npm run docs:dev     # VitePress docs
```

Requires Node.js >= 18.0.0 (CI runs Node 24).

## CI/CD

Workflows in `.github/workflows/` call shared workflows from [`fjacquet/ci`](https://github.com/fjacquet/ci).

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| **CI** | push / PR to `main` | Install, typecheck, lint, test, build |
| **Security** | push / PR to `main`, weekly (Mon) | CodeQL, OSV-Scanner dependency scan, SBOM |
| **Docs** | push to `main` | Build the VitePress site and deploy to GitHub Pages |
| **Release** | `v*` tag | Publish to npm (OIDC trusted publishing, reviewer approval), then to the [MCP Registry](https://registry.modelcontextprotocol.io) |

Releases are cut by bumping `package.json` and `server.json`, updating [CHANGELOG.md](CHANGELOG.md), and pushing an annotated `vX.Y.Z` tag.

## License

MIT — see [LICENSE](LICENSE).

Originally forked from [ConechoAI/Nano-Banana-MCP](https://github.com/ConechoAI/Nano-Banana-MCP); thanks to its authors for the starting point.
