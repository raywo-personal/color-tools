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
}


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
    .find(v => v === "regular") ?? font.variants[0];

  return {
    family: font.family,
    category: font.category,
    variant
  };
}
