import path from "node:path";

// Single mapping used both to name saved images and to label images read back.
const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export function mimeTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_TO_MIME_TYPE[ext] || "image/jpeg";
}

export function extensionForMimeType(mimeType?: string): string {
  const match = Object.entries(EXTENSION_TO_MIME_TYPE).find(
    ([, type]) => type === mimeType,
  );
  return match ? match[0] : ".png";
}
