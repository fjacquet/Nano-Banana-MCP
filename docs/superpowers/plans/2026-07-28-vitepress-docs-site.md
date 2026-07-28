# VitePress Documentation Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a browsable VitePress documentation site for Nano-Banana-MCP at `https://fjacquet.github.io/Nano-Banana-MCP/`, using the central `fjacquet/ci` workflows.

**Architecture:** Add a defaulted `build-script` input to the shared `web-deploy.yml` so npm-native repos can publish a docs site instead of an app build, release it as `v1.2.0`, then scaffold VitePress over the documentation already in `docs/` and wire a thin caller workflow.

**Tech Stack:** VitePress 2.0.0-alpha.18, GitHub Actions (`fjacquet/ci` reusable workflows), GitHub Pages.

## Global Constraints

- VitePress version is exactly `2.0.0-alpha.18`. The 1.6.4 stable line pins `vite@^5.4.14`, which carries three unfixable advisories and would force an `osv-scanner.toml` back onto this repo.
- VitePress `base` must be `/Nano-Banana-MCP/`. A wrong base breaks every asset URL.
- `srcExclude` must contain `'**/superpowers/**'` or this plan and its spec ship as public pages.
- The repo is npm-native: no Makefile, no Python tooling.
- Branch filters target `main`. Never `maincd` or `master` — those typos froze Pages on three repos since 2026-06-20.
- `fjacquet/ci` conventions: `runs-on: ubuntu-24.04` (never `ubuntu-latest`), `harden-runner` as the first step, `persist-credentials: false`, permissions declared at workflow and job level, third-party actions SHA-pinned with a `# vX.Y.Z` comment, first-party `fjacquet/ci` refs pinned to `@v1` with a trailing `# nosemgrep: github-actions.security.third-party-action-not-pinned-to-commit-sha`.
- Never interpolate `${{ }}` directly inside a `run:` block. Pass through `env:` — zizmor's `template-injection` rule is a hard gate in `self-check`.
- `fjacquet/ci` releases cut an immutable semver tag first, then move `v1` onto it.

---

### Task 1: Add `build-script` input to web-deploy.yml

**Files:**
- Modify: `~/Projects/ci/.github/workflows/web-deploy.yml`
- Modify: `~/Projects/ci/README.md`

**Interfaces:**
- Produces: `web-deploy.yml` input `build-script` (string, default `"build"`), consumed by Task 3's caller workflow.

- [ ] **Step 1: Add the input**

In `.github/workflows/web-deploy.yml`, add to the `inputs:` block after `package-manager`:

```yaml
      build-script:
        description: npm script that produces the site. Override for docs sites whose build script is not `build`.
        type: string
        default: "build"
```

- [ ] **Step 2: Consume it via env, not interpolation**

In the `build` job, extend the existing `env:` block:

```yaml
    env:
      PKG_MGR: ${{ inputs.package-manager }}
      BUILD_SCRIPT: ${{ inputs.build-script }}
```

and change the build step from `- run: $PKG_MGR run build` to:

```yaml
      - run: $PKG_MGR run "$BUILD_SCRIPT"
```

- [ ] **Step 3: Run the validation loop**

```bash
cd ~/Projects/ci
actionlint
uvx zizmor --format=github .
pinact run --check --exclude '^fjacquet/'
```

Expected: `actionlint` silent, `zizmor` exit 0 with zero findings, `pinact` exit 0. The repo baseline is zero findings — anything reported is yours.

- [ ] **Step 4: Document the input**

In `README.md`, update the `web-deploy` row of the Workflows table to mention the input, and confirm the DESIGN.md inputs column stays accurate:

```markdown
| web-deploy | `.github/workflows/web-deploy.yml` | Node.js build + deploy to GitHub Pages (`build-script` selects the npm script) | `contents: read` (build job), `pages: write`, `id-token: write` (deploy job) | — |
```

- [ ] **Step 5: Commit and open the PR**

```bash
cd ~/Projects/ci
git switch -c feat/web-deploy-build-script
git add .github/workflows/web-deploy.yml README.md
git commit -m "feat(web-deploy): add build-script input for docs sites

npm-native repos had no path to publish a documentation site through the
central workflows: web-deploy hardcoded \`npm run build\`, which in a
package repo compiles the package rather than a site.

The input defaults to \`build\`, so the four current callers are
unaffected. Passed through env rather than interpolated into the run
block, per the zizmor template-injection gate."
git push -u origin feat/web-deploy-build-script
gh pr create --fill
```

- [ ] **Step 6: Verify the self-check passes, then merge**

```bash
gh pr checks --watch
gh pr merge --merge --delete-branch
```

Expected: `lint` green. Do not proceed until it is.

- [ ] **Step 7: Cut v1.2.0 and advance v1**

```bash
cd ~/Projects/ci
git switch main && git pull
SHA=$(git rev-parse HEAD)
git tag -a v1.2.0 -m "v1.2.0" "$SHA"
git push origin v1.2.0
git tag -f -a v1 -m "v1" "$SHA"
git push -f origin v1
```

Note: `-m` is required — the local git config forces annotated tags and errors with `fatal: no tag message?` otherwise. The force-push of `v1` may be blocked by the tool sandbox; if so, hand the command to the user rather than working around it.

- [ ] **Step 8: Confirm the fleet is unbroken**

```bash
gh api 'repos/fjacquet/ci/contents/.github/workflows/web-deploy.yml?ref=v1' --jq '.size'
```

Expected: a byte count, confirming `@v1` resolves the updated file.

---

### Task 2: Scaffold the VitePress site

**Files:**
- Modify: `package.json` (devDependency + `docs:build` / `docs:dev` scripts)
- Create: `docs/.vitepress/config.ts`
- Create: `docs/index.md`
- Create: `docs/changelog.md`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: npm script `docs:build`, output directory `docs/.vitepress/dist` — both consumed by Task 3.

- [ ] **Step 1: Install VitePress**

```bash
cd ~/Projects/Nano-Banana-MCP
git switch -c docs/vitepress-site 2>/dev/null || git switch docs/vitepress-site
npm i -D vitepress@2.0.0-alpha.18
```

- [ ] **Step 2: Add the scripts**

In `package.json`, add to `scripts`:

```json
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs"
```

- [ ] **Step 3: Write the config**

Create `docs/.vitepress/config.ts`:

```ts
import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Nano-Banana MCP',
  description: 'An MCP server for AI image generation and editing using Google Gemini',
  base: '/Nano-Banana-MCP/',
  // Design docs live under docs/ but must never ship as public pages.
  srcExclude: ['**/superpowers/**'],
  themeConfig: {
    nav: [
      { text: 'Configuration', link: '/configuration' },
      { text: 'Tools', link: '/tools' },
      { text: 'Workflows', link: '/workflows' },
      { text: 'Changelog', link: '/changelog' },
    ],
    sidebar: [
      {
        text: 'Getting started',
        items: [{ text: 'Configuration', link: '/configuration' }],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Tools', link: '/tools' },
          { text: 'Example workflows', link: '/workflows' },
        ],
      },
      {
        text: 'Project',
        items: [{ text: 'Changelog', link: '/changelog' }],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/fjacquet/Nano-Banana-MCP' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/@fjacquet/nano-banana-mcp' },
    ],
    search: { provider: 'local' },
    editLink: {
      pattern: 'https://github.com/fjacquet/Nano-Banana-MCP/edit/main/docs/:path',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Fork of ConechoAI/Nano-Banana-MCP',
    },
  },
});
```

- [ ] **Step 4: Write the home page**

Create `docs/index.md`. The hero and features are derived from `README.md` lines 10-18 and the tools table at lines 50-57:

````markdown
---
layout: home

hero:
  name: Nano-Banana MCP
  text: Gemini image generation, as an MCP server
  tagline: Generate and edit images from Claude Code, Cursor, and any other MCP client.
  actions:
    - theme: brand
      text: Get started
      link: /configuration
    - theme: alt
      text: Tool reference
      link: /tools
    - theme: alt
      text: View on GitHub
      link: https://github.com/fjacquet/Nano-Banana-MCP

features:
  - icon: 🍌
    title: Three Gemini models
    details: Nano Banana 2 for pro quality at Flash speed, Nano Banana Pro for the highest quality, and the legacy Nano Banana for fast and efficient runs.
  - icon: ✏️
    title: Iterative editing
    details: Edit an existing image with optional reference images, then keep refining the last result with continue_editing.
  - icon: 🔌
    title: Client agnostic
    details: Works with Claude Code, Cursor, and any other MCP client over stdio.
---

## Quick start

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

2. Add the server to your MCP client config — Claude Code shown here:

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

See [Configuration](/configuration) for Cursor and other MCP clients.

3. Ask for what you want:

```
Generate an image of a sunset over mountains
Edit this image to add some birds in the sky
Continue editing to make it more dramatic
```
````

- [ ] **Step 5: Write the changelog page**

Create `docs/changelog.md`. The include pulls the root changelog so the two never diverge:

```markdown
---
title: Changelog
editLink: false
---

<!--@include: ../CHANGELOG.md-->
```

- [ ] **Step 6: Ignore the build output**

Append to `.gitignore`:

```
docs/.vitepress/dist
docs/.vitepress/cache
```

- [ ] **Step 7: Build and verify**

```bash
cd ~/Projects/Nano-Banana-MCP
npm run docs:build
find docs/.vitepress/dist -name '*.html' | sed 's|.*dist/||' | sort
```

Expected exactly: `404.html`, `changelog.html`, `configuration.html`, `index.html`, `tools.html`, `workflows.html`. If anything under `superpowers/` appears, `srcExclude` is wrong.

- [ ] **Step 8: Verify the three silent-failure points**

```bash
cd ~/Projects/Nano-Banana-MCP
grep -c 'Nano-Banana-MCP/assets' docs/.vitepress/dist/index.html
grep -o 'Model IDs migrated from preview to GA' docs/.vitepress/dist/changelog.html | head -1
ls docs/.vitepress/dist/superpowers 2>&1 | head -1
```

Expected: a non-zero count for the base-prefixed assets, the `3.0.0` entry text found in the changelog page (proving the include resolved), and `No such file or directory` for `superpowers`.

Note: `CHANGELOG.md` currently stops at `[3.0.0]` — the v3.0.1 release did not add an entry. That is a real gap but out of scope here; do not let it fail this step.

- [ ] **Step 9: Confirm the package build is untouched**

```bash
npm run build && npm run typecheck && npm run test:run
```

Expected: all pass. VitePress must not disturb the `tsc` build of the MCP server.

- [ ] **Step 10: Confirm the scan is still clean**

```bash
osv-scanner scan source --recursive .
```

Expected: `No issues found`. If vite advisories appear, the wrong VitePress version was installed — check that it is `2.0.0-alpha.18`, not the 1.x stable line.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json .gitignore docs/.vitepress/config.ts docs/index.md docs/changelog.md
git commit -m "docs: add VitePress documentation site

Scaffolds a VitePress site over the documentation already in docs/.
The existing configuration, tools and workflows pages are unchanged;
this adds a home page derived from the README and a changelog page that
includes the root CHANGELOG.md rather than duplicating it.

Pinned to 2.0.0-alpha.18 rather than the 1.6.4 stable line: 1.6.4 pins
vite 5.x, whose three outstanding advisories have no fix and would force
an osv-scanner.toml back onto this repo. The alpha resolves vite 8 and
scans clean. It is a docs-only devDependency and never enters the
published tarball."
```

---

### Task 3: Wire the deploy workflow and verify publication

**Files:**
- Create: `.github/workflows/docs.yml`

**Interfaces:**
- Consumes: `build-script` input from Task 1; `docs:build` script and `docs/.vitepress/dist` output from Task 2.

- [ ] **Step 1: Write the caller workflow**

Create `.github/workflows/docs.yml`:

```yaml
name: Docs
on:
  push: { branches: [main] }
permissions:
  contents: read
jobs:
  docs:
    uses: fjacquet/ci/.github/workflows/web-deploy.yml@v1
    permissions:
      contents: read
      pages: write
      id-token: write
    with:
      node-version: "24"
      build-script: "docs:build"
      build-dir: "docs/.vitepress/dist"
```

- [ ] **Step 2: Validate it**

```bash
cd ~/Projects/Nano-Banana-MCP
actionlint .github/workflows/docs.yml
```

Expected: silent.

- [ ] **Step 3: Confirm the branch filter**

```bash
grep -n 'branches' .github/workflows/docs.yml
```

Expected: `branches: [main]`. Not `maincd`, not `master`.

- [ ] **Step 4: Commit and open the PR**

```bash
git add .github/workflows/docs.yml
git commit -m "ci(docs): publish the VitePress site to GitHub Pages

Thin caller of fjacquet/ci web-deploy, using the build-script input
added in ci v1.2.0 so the docs build runs instead of the package build."
git push -u origin docs/vitepress-site
gh pr create --fill
```

- [ ] **Step 5: Verify checks, then merge**

```bash
gh pr checks --watch
gh pr merge --merge --delete-branch
```

- [ ] **Step 6: Confirm Pages actually published**

```bash
cd ~/Projects/Nano-Banana-MCP
gh run list --workflow=Docs -L 1
gh api repos/fjacquet/Nano-Banana-MCP/pages --jq '"status=\(.status) url=\(.html_url)"'
```

Expected: the Docs run concluded `success`, and Pages `status` is `built` — it was `null` before this work, which is the whole point.

- [ ] **Step 7: Confirm the served site works**

```bash
curl -sI https://fjacquet.github.io/Nano-Banana-MCP/ | head -1
curl -s https://fjacquet.github.io/Nano-Banana-MCP/ | grep -c 'Nano-Banana-MCP/assets'
```

Expected: `HTTP/2 200`, and a non-zero asset count confirming `base` resolved correctly in production.

- [ ] **Step 8: Confirm the four existing web-deploy callers still work**

```bash
for r in presizion linux-generators vgpu-advisor 360gantt; do
  printf '%-18s ' "$r"
  (cd ~/Projects/$r && gh run list --workflow=Deploy -L 1 --json conclusion,createdAt \
    --jq '"\(.[0].conclusion) \(.[0].createdAt)"')
  echo
done
```

Expected: their most recent Deploy runs are still `success`. The `build-script` default makes this a no-op change for them, but `v1` moved underneath them, so confirm rather than assume.

---

## Out of scope

- Migrating `icons` off its bespoke `deploy.yml` onto `web-deploy.yml@v1`, and fixing its `master` branch filter.
- Fixing the `maincd` branch filters that froze Pages on `elk-sizer` and `netstack`.
- Clearing `icons`' three vite waivers by moving it to VitePress 2.
- The `README.md` npm badge pointing at `nano-banana-mcp` while the package is published as `@fjacquet/nano-banana-mcp`.
- Adding the missing `[3.0.1]` entry to `CHANGELOG.md`. The release shipped without one.

Each is a separate, independently valuable change.
