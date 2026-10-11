# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nano-Banana MCP is a Model Context Protocol server that provides AI image generation and editing via Google Gemini. It exposes 6 MCP tools and is distributed as an npm package (`@fjacquet/nano-banana-mcp`) runnable with `npx nano-banana-mcp`.

Supported models (`SUPPORTED_MODELS` in `src/index.ts`):
- `gemini-nano-banana-2.1` (default, `DEFAULT_MODEL`) — Nano Banana 2.1
- `gemini-3-pro-image` — Nano Banana Pro; the only model allowed with `useGoogleSearch` (`GROUNDING_MODEL`)
- `gemini-3.1-flash-image` — Nano Banana 2, previous default
- `gemini-3.1-flash-lite-image` — Nano Banana 2 Lite, 1K output only
- `gemini-2.5-flash-image` — legacy, Google shutdown 2027-03-15

All are called through `models.generateContent` (not the Interactions API). Check Google's deprecations page before changing IDs: https://ai.google.dev/gemini-api/docs/deprecations

## Build & Development Commands

```bash
npm run build                # tsc to dist/ + chmod +x
npm run dev                  # Run directly with tsx (no build step)
npm start                    # Run compiled dist/index.js
npm test                     # Jest unit tests (src/test/)
npx tsx test-integration.ts  # Structure/build/schema checks, no network
npm run lint                 # Biome lint on src/
npm run format               # Biome format --write on src/
npm run typecheck            # tsc --noEmit
npm run docs:dev             # VitePress docs (docs/), docs:build for static output
```

## Architecture

Server: `src/index.ts`, class `NanoBananaMCP`. `src/image-mime.ts` holds the one extension ↔ MIME mapping used to name saved images and label images read back. `index.ts` starts the server when imported, so logic that needs unit tests goes in its own module.

- Wraps MCP SDK `McpServer`; the 6 tools are registered with `registerTool()` and Zod input shapes; stdio transport
- Config priority: `GEMINI_API_KEY` env var (what MCP client `env` blocks set) > `~/.nano-banana-config.json`
- `validateImagePath()` enforces allowed extensions, the 20MB limit, and allowed roots (home, tmpdir, cwd unless cwd is a system path)
- `buildImageResponse()` / `saveImage()` are shared by the generate and edit flows; images go to `<cwd>/generated_imgs`, falling back to `~/nano-banana-images` when cwd is a system or temp path
- `resolveModel()` validates the optional model parameter against `SUPPORTED_MODELS`; `buildGenerationConfig()` maps `aspectRatio` / `imageSize` / `useGoogleSearch` to the request config
- Tool handlers pass the whole parsed `args` object through. A handler that picks fields by name silently drops new options; `test-integration.ts` guards this for `generate_image`.

## Key Technical Details

- **Module system**: ESM (`"type": "module"`, target ES2022, module NodeNext)
- **Strict mode**: enabled
- **Runtime**: Node.js >= 18.0.0 (CI runs Node 24)
- **Validation**: Zod for config and tool inputs, custom validators for image paths
- **Entry point**: `dist/index.js` with shebang for npm binary
- **Unused var convention**: prefix with `_`
- **Config location**: `~/.nano-banana-config.json` (home directory, mode 0600)
- **stdout is the JSON-RPC channel**: never log to stdout (use stderr). `dotenv` was removed for this reason and `test-integration.ts` asserts it stays out.

## Adding or Renaming a Model

Touch all of: `SUPPORTED_MODELS` / `DEFAULT_MODEL` / `MODEL_DESCRIPTION` in `src/index.ts`, `src/test/index.test.ts`, the `requiredElements` list in `test-integration.ts`, `README.md`, `docs/tools.md`, `docs/configuration.md`, `docs/index.md`.

## Docs Structure

VitePress site in `docs/`, deployed to GitHub Pages on push to `main`:

- `docs/index.md` — landing page
- `docs/configuration.md` — setup for Claude Code, Cursor, other clients
- `docs/tools.md` — full tool API reference
- `docs/workflows.md` — example usage patterns

## Release

1. PR bumping `package.json` with `npm version X.Y.Z --no-git-tag-version` plus a `CHANGELOG.md` entry; merge it.
2. Push an annotated tag `vX.Y.Z` on the merge commit. `release.yml` publishes to npm through `fjacquet/ci` `npm-release.yml` (OIDC trusted publishing).
3. The tag must equal `v` + `package.json` version or the publish is refused, and npm never allows republishing a version.
4. The `npm` environment requires reviewer approval before the publish job runs.

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
