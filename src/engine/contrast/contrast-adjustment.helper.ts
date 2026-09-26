import {Color} from "chroma-js";
import {APCAPolarity} from "@engine/contrast/apca-rating.helper";


export const ADJUSTABLE_COLORS = ["background", "text"] as const;
export type AdjustableColor = typeof ADJUSTABLE_COLORS[number];

export interface ContrastAdjustment {
  /**
   * The moved color. May not meet the APCA requirements. See `meetsRequirement`.
   * The color is rounded to the nearest sRGB color.
   */
  color: Color;

  /**
   * Whether the pair meets the requested contrast requirement.
   * If `false` the given colors are the nearest approximation.
   */
  meetsRequirement: boolean;

  /**
   * Signed OKLch lightness move on a 0 to 1 scale: positive is lighter,
   * negative darker. 0 where the pair already passed.
   */
  lightnessDelta: number;
  /**
   * OKLch chroma of the result. Lower than originalChroma where sRGB cannot
   * carry the original saturation at the new lightness – the color then
   * looks duller.
   */
  chroma: number;
  /**
   * OKLch chroma of the original adjusted color.
   */
  originalChroma: number;

  /**
   * APCA Lc of the resulting pair. Positive where the text is darker than the
   * background, negative where it is lighter.
   */
  actualLc: number;
  /**
   * The Lc this font size and weight asks for. Null where no contrast makes
   * text of this size and weight readable.
   */
  requiredLc: number | null;
  /**
   * dark-on-light where the text is darker than the background, light-on-dark
   * where it is lighter. It can differ from the original pair where the
   * smaller move crossed the lightness of the color held.
   */
  lcPolarity: APCAPolarity;
}


export function adjustColorForContrast(textColor: Color | string,
                                       bgColor: Color | string,
                                       adjustable: AdjustableColor,
                                       requestedLc: number): ContrastAdjustment {
  return {} as ContrastAdjustment;
}
