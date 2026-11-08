import { describe, expect, test } from "@jest/globals";
import { buildGenerationConfig } from "../generation-config.js";

describe("buildGenerationConfig", () => {
  test("returns undefined when no option is set", () => {
    expect(buildGenerationConfig({})).toBeUndefined();
  });

  test("maps aspect ratio and image size to imageConfig", () => {
    expect(
      buildGenerationConfig({ aspectRatio: "16:9", imageSize: "2K" }),
    ).toEqual({ imageConfig: { aspectRatio: "16:9", imageSize: "2K" } });
  });

  test("maps preset to an aspect ratio, explicit aspectRatio wins", () => {
    expect(buildGenerationConfig({ preset: "web" })).toEqual({
      imageConfig: { aspectRatio: "16:9" },
    });
    expect(buildGenerationConfig({ preset: "phone", imageSize: "2K" })).toEqual(
      { imageConfig: { aspectRatio: "9:16", imageSize: "2K" } },
    );
    expect(buildGenerationConfig({ preset: "banner" })).toEqual({
      imageConfig: { aspectRatio: "4:1" },
    });
    expect(buildGenerationConfig({ preset: "webconf" })).toEqual({
      imageConfig: { aspectRatio: "16:9" },
    });
    expect(
      buildGenerationConfig({ preset: "web", aspectRatio: "4:3" }),
    ).toEqual({ imageConfig: { aspectRatio: "4:3" } });
  });

  test("enables Google Search grounding as a tool", () => {
    expect(buildGenerationConfig({ useGoogleSearch: true })).toEqual({
      tools: [{ googleSearch: {} }],
    });
  });

  test("sends thinking level in the SDK's upper-case form", () => {
    expect(buildGenerationConfig({ thinkingLevel: "high" })).toEqual({
      thinkingConfig: { thinkingLevel: "HIGH" },
    });
    expect(buildGenerationConfig({ thinkingLevel: "minimal" })).toEqual({
      thinkingConfig: { thinkingLevel: "MINIMAL" },
    });
  });

  test("combines every option", () => {
    expect(
      buildGenerationConfig({
        aspectRatio: "1:1",
        useGoogleSearch: true,
        thinkingLevel: "medium",
      }),
    ).toEqual({
      imageConfig: { aspectRatio: "1:1" },
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingLevel: "MEDIUM" },
    });
  });
});
