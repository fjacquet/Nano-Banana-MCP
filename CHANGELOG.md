# Changelog

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
