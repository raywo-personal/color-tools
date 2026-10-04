/**
 * The five ways the palette is shown: normal vision and the four deficiency
 * models the block simulates.
 *
 * Normal is one of them rather than a special case above them, so a caller
 * loops over one list and `simulateVision()` answers for every entry. The
 * order is the one the block draws.
 */
export const VISION_MODELS = [
  "normal",
  "deuteranopia",
  "protanopia",
  "tritanopia",
  "achromatopsia"
] as const;

export type VisionModel = typeof VISION_MODELS[number];


const VISION_CAPTIONS: Record<VisionModel, string> = {
  "normal": "Normal",
  "deuteranopia": "Deuteranopia",
  "protanopia": "Protanopia",
  "tritanopia": "Tritanopia",
  "achromatopsia": "Achromatopsia"
};


/**
 * The name of a vision model, as it is written for a reader.
 *
 * Here rather than in the component, so the MCP server names the rows the way
 * the screen does.
 */
export function visionCaption(this: void, vision: VisionModel): string {
  return VISION_CAPTIONS[vision];
}
