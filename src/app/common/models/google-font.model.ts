import {FONT_WEIGHT_RANGE, WEIGHT_STOPS} from "@engine/contrast/type-settings.model";


/**
 * Represents a Google Font from the Google Fonts API
 */
export interface GoogleFont {
  /** Font family name */
  family: string;
  /** Available font variants (e.g., 'regular', '700', 'italic') */
  variants: string[];
  /** Available character subsets (e.g., 'latin', 'latin-ext') */
  subsets: string[];
  /** Font version */
  version: string;
  /** Last modified date */
  lastModified: string;
  /** URLs to font files for different variants */
  files: Record<string, string>;
  /** Font category (e.g., 'serif', 'sans-serif', 'display', 'handwriting', 'monospace') */
  category: string;
  /** Font kind (typically 'webfonts#webfont') */
  kind: string;
  /** Optional menu subset for optimization */
  menu?: string;
}

/**
 * Response from Google Fonts API
 */
export interface GoogleFontsApiResponse {
  kind: string;
  items: GoogleFont[];
}

/**
 * Selected font information to be stored in state
 */
export interface SelectedFont {
  /** Font family name */
  family: string;
  /** Font category */
  category: string;
  /** Selected variant (defaults to 'regular') */
  variant: string;
  /**
   * The upright weights the family ships, ascending.
   *
   * Carried in the selection rather than looked up again, because the two
   * places that need it outlive the catalog request: the WEIGHT slider stands
   * on them, so the rating never judges a weight the browser synthesised, and
   * the loader asks Google for the same set, so what is loaded and what can be
   * selected cannot drift apart.
   *
   * Empty where the selection predates the field. Both readers fall back:
   * `weightStopsFor()` to the full grid, the loader to the family's default
   * weight.
   */
  weights: readonly number[];
}


/** A variant is one of the italics, which carry no weight of their own here. */
const ITALIC = /italic/i;

/** The Google Fonts spelling of weight 400. */
const REGULAR = "regular";


/**
 * Retrieves the regular font variant from the given GoogleFont object.
 *
 * @param {GoogleFont} font - An object representing a Google Font, including
 *                            its family, category, variants, and file URLs.
 * @return {SelectedFont} An object containing the selected font's family,
 *                        category, variant, and file URL. If a "regular"
 *                        variant is not found, it defaults to the first
 *                        available variant.
 */
export function getRegularFont(font: GoogleFont): SelectedFont {
  const variant = font.variants
    .find(v => v === REGULAR) ?? font.variants[0];

  return {
    family: font.family,
    category: font.category,
    variant,
    weights: fontWeightsOf(font)
  };
}


/**
 * The upright weights a family ships, as numbers and ascending.
 *
 * The italics are left out: they are the same weights in another style, and
 * nothing in the app sets the preview in italics. `regular` is the API's
 * spelling of 400.
 */
export function fontWeightsOf(font: GoogleFont): number[] {
  const weights = font.variants
    .filter(variant => !ITALIC.test(variant))
    .map(variant => variant === REGULAR ? 400 : Number(variant))
    .filter(weight => Number.isFinite(weight));

  return [...new Set(weights)].sort((a, b) => a - b);
}


/**
 * The weights the WEIGHT slider can stand on for a given selection.
 *
 * The family's own weights, narrowed to the range the control covers. A
 * selection without weights - none chosen, or one stored before the field
 * existed - falls back to the whole grid, which is what the app's own type
 * stack offers. So does a family that ships nothing inside the range at all:
 * a slider with no stop would be worse than one whose ends the browser has to
 * synthesise, and no family in the catalog is in that position.
 */
export function weightStopsFor(font: SelectedFont | null): readonly number[] {
  const stops = (font?.weights ?? []).filter(
    weight => weight >= FONT_WEIGHT_RANGE.min && weight <= FONT_WEIGHT_RANGE.max
  );

  return stops.length > 0 ? stops : WEIGHT_STOPS;
}
