# Tools Reference

## generate_image

Create a new image from a text prompt.

```typescript
generate_image({
  prompt: "A futuristic city at night with neon lights",
  model?: "gemini-2.5-flash-image" // optional, default
})
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `prompt` | Yes | Text description of the image to create |
| `model` | No | `gemini-2.5-flash-image` (default) or `gemini-3-pro-image-preview` |

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
| `model` | No | Model to use |

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
| `model` | No | Model to use |

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
