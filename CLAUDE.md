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

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
