# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nano-Banana MCP is a Model Context Protocol server that provides AI image generation and editing via Google Gemini. It exposes 6 MCP tools and is distributed as an npm package runnable with `npx nano-banana-mcp`.

Two models are supported:
- `gemini-2.5-flash-image` (default) — fast, efficient
- `gemini-3-pro-image-preview` — professional quality with advanced reasoning

## Build & Development Commands

```bash
npm run build        # TypeScript compilation to dist/
npm run dev          # Run directly with tsx (no build step)
npm start            # Run compiled dist/index.js
npm test             # Run Jest test suite
npm run lint         # ESLint on src/**/*.ts
npm run typecheck    # Type-check without emitting
```

Tests are in `src/test/index.test.ts`. Integration tests in `test-integration.ts`.

## Architecture

Single-file server: `src/index.ts` containing class `NanoBananaMCP`:

- Extends MCP SDK `Server`, communicates over stdio transport
- Tool handlers registered via `ListToolsRequestSchema` / `CallToolRequestSchema`
- Config priority: MCP env vars > `GEMINI_API_KEY` env var > `~/.nano-banana-config.json`
- `validateImagePath()` enforces allowed extensions and 20MB size limit
- `buildImageResponse()` / `saveImage()` are shared helpers (DRY) used by both generate and edit flows
- `resolveModel()` validates the optional model parameter against `SUPPORTED_MODELS`

## Key Technical Details

- **Module system**: ESM (`"type": "module"`, target ES2022, module ESNext)
- **Strict mode**: enabled
- **Runtime**: Node.js >= 18.0.0
- **Validation**: Zod for config, custom validators for image paths
- **Entry point**: `dist/index.js` with shebang for npm binary
- **Unused var convention**: prefix with `_` (ESLint rule)
- **Config location**: `~/.nano-banana-config.json` (home directory, mode 0600)

## Docs Structure

- `docs/configuration.md` — setup for Claude Code, Cursor, other clients
- `docs/tools.md` — full tool API reference
- `docs/workflows.md` — example usage patterns

## Changelog

Maintained in `CHANGELOG.md` at the project root. Update it with every release.
