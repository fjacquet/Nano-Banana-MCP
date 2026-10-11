# Tools Reference

## generate_image

Create a new image from a text prompt.

```typescript
generate_image({
  prompt: "A futuristic city at night with neon lights",
  model?: "gemini-nano-banana-2.1", // optional, default
  aspectRatio?: "16:9",
  imageSize?: "2K",
  thinkingLevel?: "high"
})
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `prompt` | Yes | Text description of the image to create |
| `model` | No | Model to use, see [Image options](#image-options) |
| `aspectRatio` | No | Output shape, see [Image options](#image-options) |
| `imageSize` | No | Output resolution, see [Image options](#image-options) |
| `useGoogleSearch` | No | Google Search grounding (Pro only), see [Image options](#image-options) |
| `thinkingLevel` | No | Reasoning effort, see [Image options](#image-options) |

## edit_image

Edit a specific image file, optionally using reference images.

```typescript
edit_image({
  imagePath: "/path/to/image.png",
  prompt: "Add a rainbow in the sky",
  referenceImages?: ["/path/to/reference.jpg"],
  model?: "gemini-2.5-flash-image"
})
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `imagePath` | Yes | Full file path to the image to edit |
| `prompt` | Yes | Text describing the modifications |
| `referenceImages` | No | Array of file paths for style transfer / guidance |
| `model` | No | Model to use, see [Image options](#image-options) |
| `aspectRatio` | No | Output shape, see [Image options](#image-options) |
| `imageSize` | No | Output resolution, see [Image options](#image-options) |
| `useGoogleSearch` | No | Google Search grounding (Pro only), see [Image options](#image-options) |
| `thinkingLevel` | No | Reasoning effort, see [Image options](#image-options) |

## continue_editing

Continue editing the last generated/edited image in the session.

```typescript
continue_editing({
  prompt: "Make it more colorful",
  referenceImages?: ["/path/to/style.jpg"],
  model?: "gemini-2.5-flash-image"
})
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `prompt` | Yes | Text describing the modifications |
| `referenceImages` | No | Array of reference image file paths |
| `model` | No | Model to use, see [Image options](#image-options) |
| `aspectRatio` | No | Output shape, see [Image options](#image-options) |
| `imageSize` | No | Output resolution, see [Image options](#image-options) |
| `useGoogleSearch` | No | Google Search grounding (Pro only), see [Image options](#image-options) |
| `thinkingLevel` | No | Reasoning effort, see [Image options](#image-options) |

## Image options

Shared by `generate_image`, `edit_image` and `continue_editing`. All are optional; when one is omitted the server sends nothing for it and the model's own default applies. Not every model supports every value: Google's API rejects an unsupported combination with an explicit error, which the tool returns as-is.

| Option | Values | Notes |
|--------|--------|-------|
| `model` | `gemini-nano-banana-2.1` (default), `gemini-3-pro-image`, `gemini-3.1-flash-image`, `gemini-3.1-flash-lite-image`, `gemini-2.5-flash-image` | See [Model Selection](./configuration.md#model-selection). |
| `aspectRatio` | `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`, and the panoramic `1:4`, `4:1`, `1:8`, `8:1` | Omitted, the model picks the shape: in testing every model returned landscape output for new images (about 16:9, e.g. 1376×768), while edits kept the source image's shape. Pass `"1:1"` explicitly for a square image. |
| `imageSize` | `512px`, `1K`, `2K`, `4K` | Model default is `1K`. Nano Banana 2 Lite produces `1K` only. |
| `useGoogleSearch` | `true` / `false` | Grounds the image in live Google Search results (current dates, weather, events). Only `gemini-3-pro-image` is allowed; any other model is rejected before the API is called. |
| `thinkingLevel` | `minimal`, `medium`, `high` | How much the model reasons before drawing. `high` helps complex prompts (infographics, text in images, several consistent characters) but is slower; `minimal` is fastest and cheapest. Model default is `medium` on Nano Banana 2.1. `gemini-3.1-flash-image` and Lite accept only `minimal` / `high`; `gemini-2.5-flash-image` has no thinking levels. |

## get_last_image_info

Get information about the last generated/edited image.

```typescript
get_last_image_info()
```

No parameters.

## configure_gemini_token

Configure your Gemini API key (saved to `~/.nano-banana-config.json`).

```typescript
configure_gemini_token({
  apiKey: "your-gemini-api-key"
})
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `apiKey` | Yes | Gemini API key from Google AI Studio |

## get_configuration_status

Check if the API key is configured and its source.

```typescript
get_configuration_status()
```

No parameters.
