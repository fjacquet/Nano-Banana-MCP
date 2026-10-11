export interface GenerationOptions {
  aspectRatio?: string;
  imageSize?: string;
  useGoogleSearch?: boolean;
  thinkingLevel?: string;
}

export function buildGenerationConfig({
  aspectRatio,
  imageSize,
  useGoogleSearch,
  thinkingLevel,
}: GenerationOptions):
  | { imageConfig?: object; tools?: object[]; thinkingConfig?: object }
  | undefined {
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
