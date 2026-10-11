import { describe, expect, test } from "@jest/globals";
import { extensionForMimeType, mimeTypeForPath } from "../image-mime.js";

describe("Image MIME mapping", () => {
  test("names saved files after the MIME type Gemini returns", () => {
    expect(extensionForMimeType("image/jpeg")).toBe(".jpg");
    expect(extensionForMimeType("image/png")).toBe(".png");
    expect(extensionForMimeType("image/webp")).toBe(".webp");
  });

  test("falls back to .png when the MIME type is missing or unknown", () => {
    expect(extensionForMimeType(undefined)).toBe(".png");
    expect(extensionForMimeType("image/heic")).toBe(".png");
  });

  test("a saved file is read back with the MIME type it was saved with", () => {
    for (const mimeType of [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]) {
      expect(mimeTypeForPath(`img${extensionForMimeType(mimeType)}`)).toBe(
        mimeType,
      );
    }
  });

  test("reads MIME type from the extension, case-insensitively", () => {
    expect(mimeTypeForPath("/a/b/photo.JPEG")).toBe("image/jpeg");
    expect(mimeTypeForPath("/a/b/photo.png")).toBe("image/png");
  });
});
