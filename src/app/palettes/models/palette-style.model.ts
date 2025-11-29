import {randomBetween} from "@common/helpers/random.helper";


export const PaletteStyles = [
  "analogous",
  "muted-analog-split",
  "monochromatic",
  "vibrant-balanced",
  "high-contrast",
  "triadic",
  "complementary",
  "split-complementary"
] as const;

export type PaletteStyle = typeof PaletteStyles[number];


export function randomStyle(): PaletteStyle {
  const randomIndex = Math.floor(randomBetween(0, PaletteStyles.length));

  return PaletteStyles[randomIndex];
}


export function styleCaptionFor(style: PaletteStyle): string {
  switch (style) {
    case "monochromatic":
      return "Monochromatic";
    case "complementary":
      return "Complementary";
    case "split-complementary":
      return "Split Complementary";
    case "triadic":
      return "Triadic";
    case "analogous":
      return "Analogous";
    case "vibrant-balanced":
      return "Vibrant";
    case "high-contrast":
      return "High Contrast";
    case "muted-analog-split":
      return "Muted Analogous";
    default:
      return "";
  }
}


export function styleDescriptionFor(style: PaletteStyle): string {
  switch (style) {
    case "vibrant-balanced":
      return "A palette with three vibrant accent colors derived from a triad and two light complementary tones.";
    case "muted-analog-split":
      return "A muted palette featuring neutral, analogous, pastel and complementary colors with reduced saturation.";
    case "high-contrast":
      return "A high-contrast palette with vibrant accents, deep tones, and near-white colors for maximum visual impact.";
    case "monochromatic":
      return "A palette based on a single color with different saturation levels and lightness levels.";
    case "complementary":
      return "A palette based on two colors positioned opposite each other on the color wheel.";
    case "triadic":
      return "A palette using three colors equally spaced around the color wheel.";
    case "analogous":
      return "A palette using colors that are next to each other on the color wheel.";
    case "split-complementary":
      return "A palette using a base color and two colors adjacent to its complement.";
    default:
      return "";
  }
}
