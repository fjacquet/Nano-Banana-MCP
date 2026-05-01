# Changelog

## [2.3.1] - 2026-05-01

### Fixed
- Published bin (`dist/index.js`) is now marked executable in the tarball.
  In 2.3.0 it shipped as `0644`, causing `npx @fjacquet/nano-banana-mcp` to
  fail with `sh: nano-banana-mcp: command not found`. The `build` script now
  runs `chmod +x dist/index.js` after `tsc`.

## [2.3.0] - 2026-05-01

### Security
- **Image path sandbox**: `validateImagePath` now canonicalizes via `fs.realpath`
  (defeating symlink-based escapes) and rejects paths outside the user's home
  directory, OS tmpdir, or current working directory. System roots (`/etc`,
  `/usr`, `/var`, `/proc`, `/sys`, `/dev`, `/root`, `/boot`) are excluded.
  Closes the prior data-exfiltration path where an LLM-supplied image path
  pointing at e.g. `/etc/passwd` would be base64-uploaded to the Gemini API.

### Added
- `useGoogleSearch` boolean parameter on `generate_image`, `edit_image`, and
  `continue_editing` — enables Google Search grounding for fact-aware image
  generation. Requires model `gemini-3-pro-image-preview` (Flash variants
  don't support grounding); throws `InvalidParams` on other models.

### Changed
- Migrated from the low-level `Server` + `setRequestHandler(*Schema, …)` MCP
  SDK API to the high-level `McpServer` + `registerTool` API. Tool schemas
  are now declared once via Zod (single source of truth), replacing the
  hand-written JSON Schema and parallel TypeScript cast types. Tool
  handlers receive parsed, type-safe arguments directly. Net −116 LoC.
- Bumped runtime deps: `@google/genai` 1.39 → 1.51, `@modelcontextprotocol/sdk`
  1.25 → 1.29, `zod` 4.3 → 4.4. Patched 8 transitive vulnerabilities
  (1 critical in protobufjs, plus minimatch/picomatch/hono ReDoS and
  traversal issues) via in-semver fixes.

## [2.2.2] - 2026-03-10

### Fixed
- Fix `mkdir '/'` error when server is invoked via `npx` with `cwd = /`.
  `getImagesDirectory()` now also catches `/` and `/tmp/` as unsafe working
  directories, falling back to `~/nano-banana-images/` instead.

## [2.2.1] - 2026-03-10

### Fixed
- Remove `dotenv` dependency to prevent stdout pollution breaking MCP JSON-RPC transport.
  dotenv v17 prints a banner to stdout; since MCP servers communicate via stdio JSON-RPC,
  this caused `Unexpected token 'd', "[dotenv@17."... is not valid JSON` errors in clients.
  Auth is handled via `GEMINI_API_KEY` env var or `~/.nano-banana-config.json` — no `.env` needed.

## [2.2.0] - 2026-02-28

### Changed
- Default model upgraded to `gemini-3.1-flash-image-preview` (Nano Banana 2 — pro quality at Flash speed)
- `gemini-2.5-flash-image` retained as a legacy option
- Model descriptions updated across all tools

### Added
- `aspectRatio` parameter on `generate_image`, `edit_image`, `continue_editing`
  - Supported values: `1:1`, `1:4`, `1:8`, `2:3`, `3:2`, `3:4`, `4:1`, `4:3`, `4:5`, `5:4`, `8:1`, `9:16`, `16:9`, `21:9`
- `imageSize` parameter on `generate_image`, `edit_image`, `continue_editing`
  - Supported values: `512px`, `1K` (default), `2K`, `4K`
- Both parameters passed to the API via `config.imageConfig`

## [2.1.0] - 2025-01-31

### Changed
- Upgraded all dependencies to latest versions (0 vulnerabilities)
  - `eslint` 8 → 9 with flat config (`eslint.config.mjs` replaces `.eslintrc.json`)
  - `typescript-eslint` 6 → 8 (unified `typescript-eslint` package)
  - `zod` 3 → 4 (`.errors` → `.issues`)
  - `dotenv` 16 → 17
  - `@types/node` 20 → 25
- Added Jest + ts-jest as explicit devDependencies (were missing)

## [2.0.0] - 2025-01-31

### Fixed
- Model name: `gemini-2.5-flash-image-preview` replaced with `gemini-2.5-flash-image` (fixes 404 error)
- Config file now saved to home directory (`~/.nano-banana-config.json`) instead of `process.cwd()` with `0o600` permissions
- Path traversal protection: image file inputs validated for extension and size
- File size validation (20MB limit) before reading images into memory
- Silent reference image failures now reported as warnings in response
- Tests aligned with actual `@google/genai` package (was mocking wrong package `@google/generative-ai`)

### Added
- Model selection: optional `model` parameter on `generate_image`, `edit_image`, `continue_editing`
  - `gemini-2.5-flash-image` (default, fast)
  - `gemini-3-pro-image-preview` (pro, higher quality with reasoning)
- GIF support (`.gif`) in allowed image extensions
- `docs/` folder with configuration, tools reference, and workflow guides
- This changelog

### Changed
- Simplified README — detailed docs moved to `docs/`
- Updated repository URLs to fjacquet fork
- Removed `any` types in favor of proper interfaces (`ImagePart`, `TextPart`, `ContentPart`, `SavedImage`)
- DRY: extracted shared response-building logic into `buildImageResponse()` and `saveImage()`
- Removed `claude-config.json` (contained hardcoded local path)
- Version bumped to 2.0.0

## [1.0.3] - Previous (ConechoAI)

- Original release with `gemini-2.5-flash-image-preview` model (now deprecated by Google)
