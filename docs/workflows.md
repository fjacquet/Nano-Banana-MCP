# Example Workflows

## Basic Image Generation

1. `generate_image` — Create your base image
2. `continue_editing` — Refine and improve
3. `continue_editing` — Add final touches

## Style Transfer

1. `generate_image` — Create base content
2. `edit_image` — Use reference images for style
3. `continue_editing` — Fine-tune the result

## Iterative Design

1. `generate_image` — Start with a concept
2. `get_last_image_info` — Check current state
3. `continue_editing` — Make adjustments
4. Repeat until satisfied

## Pro Quality Output

Use `model: "gemini-3-pro-image-preview"` for any step when you need higher quality output with advanced reasoning.

```
generate_image({ prompt: "...", model: "gemini-3-pro-image-preview" })
```
