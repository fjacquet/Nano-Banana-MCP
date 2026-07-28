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
