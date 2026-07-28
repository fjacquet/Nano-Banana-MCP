# Nano-Banana-MCP documentation site

**Date:** 2026-07-28
**Status:** approved

## Problem

GitHub Pages is enabled on `fjacquet/Nano-Banana-MCP` (`build_type=workflow`) but has never
deployed — the API reports `status=null`, so `https://fjacquet.github.io/Nano-Banana-MCP/`
serves nothing. The repository has no static site generator and no publishing workflow.

The content already exists and is well structured: `README.md` (80 lines), `CHANGELOG.md`
(136), `docs/configuration.md` (106), `docs/tools.md` (89), `docs/workflows.md` (28).
Nothing needs to be written; it needs to be built and published.

A second problem blocks the obvious fix. The fleet's reusable `web-deploy.yml` hardcodes
`$PKG_MGR run build`. In this repository `build` is `tsc && chmod +x dist/index.js` — it
compiles the MCP server, not a site. There is currently no path for an npm-native repo to
publish a documentation site through the central workflows.

## Goals

- Publish a browsable documentation site at `https://fjacquet.github.io/Nano-Banana-MCP/`
- Reuse the central `fjacquet/ci` workflows rather than rolling a bespoke deploy
- Serve the existing content essentially unchanged

## Non-goals

- Rewriting or expanding the documentation content
- A marketing landing page for the npm package
- Generating API reference from the TypeScript tool schemas

## Design

### Generator

VitePress, matching the existing fleet precedent (`icons` uses
`docs:build: vitepress build docs` with `docs/.vitepress/config.ts`). It is npm-native,
so it respects the standing convention that web repos carry no Makefile.

### Site layout

VitePress takes `docs/` as its source root:

```
docs/
  .vitepress/config.ts     nav, sidebar, base
  index.md                 home page (hero + quickstart, derived from README.md)
  configuration.md         existing, unchanged
  tools.md                 existing, unchanged
  workflows.md             existing, unchanged
  changelog.md             includes the root CHANGELOG.md
```

Two configuration details that break the site if missed:

- `base` must be `/Nano-Banana-MCP/`. The site is served from a sub-path, not a domain
  root, and a wrong `base` breaks every asset URL.
- Every file under `docs/` becomes a published page. This spec lives at
  `docs/superpowers/specs/`, so the config must set `srcExclude: ['superpowers/**']` or
  design documents ship as public pages.

### Enabling change in fjacquet/ci

Add an additive input to `web-deploy.yml`:

```yaml
build-script:
  type: string
  default: "build"
```

and replace `$PKG_MGR run build` with `$PKG_MGR run "$BUILD_SCRIPT"`, passing the value
through `env:` rather than interpolating `${{ }}` directly into the `run` block — direct
interpolation trips zizmor's `template-injection` rule, as it did on `npm-release.yml`.

The default reproduces today's behaviour exactly, so the four repos already calling
`web-deploy` (presizion, linux-generators, vgpu-advisor, 360gantt) are unaffected.

This also unblocks `icons`, whose bespoke `deploy.yml` (`runs-on: ubuntu-latest`,
`contents: write`, pushes to `gh-pages`, Pages in `build_type=legacy`) was never migrated
to the central workflow. Migrating it is out of scope here.

### Caller workflow

`.github/workflows/docs.yml` in Nano-Banana-MCP:

```yaml
uses: fjacquet/ci/.github/workflows/web-deploy.yml@v1
with:
  build-script: "docs:build"
  build-dir: "docs/.vitepress/dist"
```

Triggered on push to `main` — explicitly `main`, not the `maincd` typo that froze
elk-sizer and netstack Pages deployments since 2026-06-20.

### Release

The `build-script` input is a backward-compatible feature addition, so it ships as an
immutable `v1.2.0` tag with the moving `v1` advanced onto it. Per `DESIGN.md` D3, callers
reference `@v1`, so the moving tag must follow or no consumer receives the change. Cutting
the immutable tag first is the practice that lapsed after `v1.0.0` and was restored with
`v1.1.0` on 2026-07-28.

## Verification

- `npm run docs:build` succeeds locally and emits `docs/.vitepress/dist`
- `npm run build` still produces a working MCP server (the `tsc` build is untouched)
- The four existing `web-deploy` callers still deploy after the `v1.2.0` bump
- GitHub Pages for Nano-Banana-MCP moves from `status=null` to `built`
- The published URL serves the site with working assets and navigation

The last two are the actual success criteria. Today the URL serves nothing.

## Risks

- **Third advance of `v1` in one day.** Mitigated by the immutable tag now preceding each
  move, and by the input being defaulted and backward-compatible.
- **VitePress adds sizeable devDependencies.** No effect on the published package: the
  `files` field ships only `dist/`, `README.md` and `LICENSE`.
