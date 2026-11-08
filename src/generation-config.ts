export const PRESET_ASPECT_RATIOS = {
  web: "16:9",
  phone: "9:16",
  square: "1:1",
} as const;

export const VALID_PRESETS = ["web", "phone", "square"] as const;

export type Preset = (typeof VALID_PRESETS)[number];

export interface GenerationOptions {
  preset?: Preset;
  aspectRatio?: string;
  imageSize?: string;
  useGoogleSearch?: boolean;
  thinkingLevel?: string;
}

export function buildGenerationConfig({
  preset,
  aspectRatio: explicitAspectRatio,
  imageSize,
  useGoogleSearch,
  thinkingLevel,
}: GenerationOptions):
  | { imageConfig?: object; tools?: object[]; thinkingConfig?: object }
  | undefined {
  // An explicit aspectRatio wins over the preset.
  const aspectRatio =
    explicitAspectRatio ?? (preset && PRESET_ASPECT_RATIOS[preset]);
  const imageConfig =
    aspectRatio || imageSize
      ? {
          ...(aspectRatio && { aspectRatio }),
          ...(imageSize && { imageSize }),
        }
      : undefined;
  const tools = useGoogleSearch ? [{ googleSearch: {} }] : undefined;
  // Tool inputs use Google's documented lower-case names; the SDK's ThinkingLevel enum is upper-case.
  const thinkingConfig = thinkingLevel
    ? { thinkingLevel: thinkingLevel.toUpperCase() }
    : undefined;
  if (!imageConfig && !tools && !thinkingConfig) return undefined;
  return {
    ...(imageConfig && { imageConfig }),
    ...(tools && { tools }),
    ...(thinkingConfig && { thinkingConfig }),
  };
}
