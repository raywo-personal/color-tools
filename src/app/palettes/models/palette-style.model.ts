import {randomBetween} from "@common/helpers/random.helper";


export const PaletteStyles = [
  "random",
  "analogous",
  "muted-analog-split",
  "harmonic",
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
    case "random":
      return "Random";
    case "analogous":
      return "Analogous";
    case "muted-analog-split":
      return "Muted Analogous";
    case "harmonic":
      return "Harmonic";
    case "monochromatic":
      return "Monochromatic";
    case "vibrant-balanced":
      return "Vibrant";
    case "high-contrast":
      return "High Contrast";
    case "triadic":
      return "Triadic";
    case "complementary":
      return "Complementary";
    case "split-complementary":
      return "Split Complementary";
    default:
      return "";
  }
}


export function styleDescriptionFor(style: PaletteStyle): string {
  switch (style) {
    case "random":
      return "A random palette generated using a combination of random colors.";
    case "analogous":
      return "A palette using colors that are next to each other on the color wheel.";
    case "muted-analog-split":
      return "A muted palette featuring neutral, analogous, pastel and complementary colors with reduced saturation.";
    case "harmonic":
      return "A palette based on three colors derived from a triad and two complementary tones.";
    case "monochromatic":
      return "A palette based on a single color with different saturation levels and lightness levels.";
    case "vibrant-balanced":
      return "A palette with three vibrant accent colors derived from a triad and two light complementary tones.";
    case "high-contrast":
      return "A high-contrast palette with vibrant accents, deep tones, and near-white colors for maximum visual impact.";
    case "triadic":
      return "A palette using three colors equally spaced around the color wheel.";
    case "complementary":
      return "A palette based on two colors positioned opposite each other on the color wheel.";
    case "split-complementary":
      return "A palette using a base color and two colors adjacent to its complement.";
    default:
      return "";
  }
}
