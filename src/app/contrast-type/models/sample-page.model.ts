import chroma, {Color} from "chroma-js";
import {mixColors} from "@engine/color/mix-color.helper";
import {ContrastColors} from "@engine/contrast/contrast-colors.model";
import {findOptimalTextColor} from "@engine/contrast/optimal-text-color.helper";
import {TypeRole} from "@engine/contrast/type-role.model";
import {Palette, PALETTE_SLOTS} from "@engine/palette/palette.model";


/** The inks the sample page writes with, named after the surface they come from. */
export type SampleInk = "text" | "dim" | "accent" | "accentSoft" | "onAccent";

/** The grounds the sample page's text sits on. */
export type SampleGround = "page" | "card" | "nav" | "accent";


/**
 * One piece of text on the sample page: which role sets it, at what share of
 * the role's size, and in which ink on which ground.
 *
 * The role is here and nowhere else. The preview reads it to set the element,
 * the rating reads it to judge the role, and the verdicts to come read it per
 * element - three readers of one assignment, which is why it is data rather
 * than a branch in each of them.
 */
export interface SampleElement {

  readonly key: string;
  /** The all-caps name the rating shows and a screen reader speaks. */
  readonly caption: string;
  readonly role: TypeRole;
  /** The element's size as a share of the role's, as the draft scales it. */
  readonly sizeRatio: number;
  readonly ink: SampleInk;
  readonly ground: SampleGround;
  /**
   * Whether the Lc figure reads this element for its role. One per role.
   *
   * The figure used to read the role's weakest element, and that turned out
   * to answer nothing: the small print is set in the dim ink and measured on
   * the 14px row at Lc 100, which black on white does not reach - so the body
   * figure failed whatever the pair was. The element that stands for the role
   * is the one the visitor is actually setting; per-element verdicts are the
   * marks beside the page.
   */
  readonly figure: boolean;

}


/**
 * The elements of the page, in reading order.
 *
 * The size ratios are the draft's: at body 18px the lead is 22px and the small
 * print 13px, which is the caption size the draft names as where pairings fail
 * first. The nav items sit below the button size the same way a real nav
 * sits below a call to action.
 */
export const SAMPLE_ELEMENTS: readonly SampleElement[] = [
  {key: "navItems", caption: "NAV ITEMS", role: "ui", sizeRatio: 0.87, ink: "dim", ground: "nav", figure: false},
  {key: "signIn", caption: "SIGN IN", role: "ui", sizeRatio: 0.87, ink: "accent", ground: "nav", figure: false},
  {key: "eyebrow", caption: "EYEBROW", role: "mono", sizeRatio: 1, ink: "accentSoft", ground: "page", figure: true},
  {key: "headline", caption: "HEADLINE", role: "display", sizeRatio: 1, ink: "text", ground: "page", figure: true},
  {key: "lead", caption: "LEAD", role: "body", sizeRatio: 1.22, ink: "text", ground: "page", figure: false},
  {key: "filledButton", caption: "FILLED BUTTON", role: "ui", sizeRatio: 1, ink: "onAccent", ground: "accent", figure: true},
  {key: "ghostButton", caption: "GHOST BUTTON", role: "ui", sizeRatio: 1, ink: "text", ground: "page", figure: false},
  {key: "bodyText", caption: "BODY TEXT", role: "body", sizeRatio: 1, ink: "text", ground: "page", figure: true},
  {key: "cardLabel", caption: "CARD LABEL", role: "mono", sizeRatio: 0.9, ink: "dim", ground: "card", figure: false},
  {key: "quote", caption: "PULL QUOTE", role: "body", sizeRatio: 1.3, ink: "text", ground: "card", figure: false},
  {key: "smallPrint", caption: "SMALL PRINT", role: "body", sizeRatio: 0.72, ink: "dim", ground: "page", figure: false}
];


/** The elements a role sets, in reading order. */
export function elementsOf(role: TypeRole): readonly SampleElement[] {
  return SAMPLE_ELEMENTS.filter(element => element.role === role);
}


/**
 * The element the Lc figure reads for a role - see `SampleElement.figure`.
 * Throws where a role has none: `sample-page.model.spec.ts` pins one per role,
 * so the throw only ever meets a list edited without running the specs.
 */
export function figureElementOf(role: TypeRole): SampleElement {
  const element = SAMPLE_ELEMENTS.find(candidate => candidate.role === role && candidate.figure);

  if (!element) throw new Error(`No sample element carries the figure for "${role}"`);

  return element;
}


/**
 * The element with the given key. Throws rather than returning undefined: a
 * key is a literal in a template or a spec, and a typo there is a bug, not a
 * state.
 */
export function sampleElement(key: string): SampleElement {
  const element = SAMPLE_ELEMENTS.find(candidate => candidate.key === key);

  if (!element) throw new Error(`No sample element is called "${key}"`);

  return element;
}


/** Which role sets the element. */
export function roleOf(key: string): TypeRole {
  return sampleElement(key).role;
}


/** The ground in a sentence - `on the card`. */
const GROUND_NAMES: Record<SampleGround, string> = {
  page: "the page",
  card: "the card",
  nav: "the nav bar",
  accent: "the filled button"
};


export function groundName(ground: SampleGround): string {
  return GROUND_NAMES[ground];
}


/**
 * How far each derived surface is mixed, and towards what. The draft's
 * fractions, mixed in OKLab - see `mixColors()`.
 */
const NAV_TINT = 0.05;
const CARD_TINT = 0.09;
const DIM_MIX = 0.4;
const NAV_BORDER_MIX = 0.12;
const FOOTER_BORDER_MIX = 0.14;

/**
 * Above this WCAG relative luminance the nav bar is tinted towards black, below
 * it towards white - so the bar lifts off the page in either direction rather
 * than always in one.
 */
const LIGHT_BACKGROUND_LUMINANCE = 0.4;

const BLACK = chroma("#000000");
const WHITE = chroma("#FFFFFF");


/**
 * Every color the sample page is drawn in, derived from the pair and the
 * palette.
 *
 * Inks and grounds are `Color`s rather than hex strings, because the rating
 * measures them and the preview paints them - one derivation for both, so the
 * figure is about the page the visitor sees.
 */
export interface SamplePageColors {

  readonly page: Color;
  readonly text: Color;
  readonly dim: Color;
  readonly nav: Color;
  readonly navBorder: Color;
  readonly accent: Color;
  readonly accentSoft: Color;
  readonly onAccent: Color;
  readonly card: Color;
  readonly ghostBorder: Color;
  readonly footerBorder: Color;

}


/**
 * The page's colors from the pair and the palette.
 *
 * **Nothing in here corrects its own contrast against the pair.** The text
 * takes the text color and the page takes the background, whatever those two
 * do to each other - a page that quietly picked a readable foreground would
 * answer the visitor's question for them. The one foreground that is chosen
 * rather than given is the label on the accent button, because the accent
 * comes from the palette and is not the pair: an unreadable label there says
 * nothing about the pairing and only looks broken.
 *
 * **The palette is read in fixed roles, not through a control.** The accent -
 * wordmark, `Sign in`, the filled button, the card's edge - the ghost button's
 * outline, the eyebrow and the card's tint are the four roles, and they take
 * their colors from `PALETTE_SLOTS` in order, skipping whichever slot is also
 * the pair's ground - see `roleColorsFrom()`.
 */
export function samplePageColors(pair: ContrastColors, palette: Palette): SamplePageColors {
  const {text, background} = pair;
  const [accent, ghostBorder, accentSoft, cardTint] = roleColorsFrom(palette, background);
  const navTarget = background.luminance() > LIGHT_BACKGROUND_LUMINANCE ? BLACK : WHITE;

  return {
    page: background,
    text,
    dim: mixColors(text, background, DIM_MIX),
    nav: mixColors(background, navTarget, NAV_TINT),
    navBorder: mixColors(background, text, NAV_BORDER_MIX),
    accent,
    accentSoft,
    // Black or white, whichever APCA puts further from the accent. The choice
    // does not depend on a size, so none is passed: the button label is set at
    // a share of the UI size and has no fixed row in the table.
    onAccent: findOptimalTextColor(accent).color,
    card: mixColors(background, cardTint, CARD_TINT),
    // A palette color rather than a mix out of the pair, so the secondary
    // action reads as a second colour of the visitor's own. Only the outline
    // depends on it: the label keeps the pair's text color, so a border that
    // sits at the page's lightness would cost the box, not the words - and
    // `roleColorsFrom()` is what keeps it off the ground in the first place.
    ghostBorder,
    footerBorder: mixColors(background, text, FOOTER_BORDER_MIX)
  };
}


/** The color an element is written in. */
export function inkOf(element: SampleElement, colors: SamplePageColors): Color {
  return colors[element.ink];
}


/** The color an element sits on. */
export function groundOf(element: SampleElement, colors: SamplePageColors): Color {
  return colors[element.ground];
}


/**
 * The four roles' colors - accent, ghost border, eyebrow, card tint, in that
 * order - read from the palette in slot order, skipping whichever slot is
 * also the pair's ground.
 *
 * `color0` is both the accent and a candidate for the ground once the pair is
 * taken from the same five colors, and a role landing on the ground is not a
 * low-contrast choice but an invisible one - about a fifth of palettes would
 * otherwise put the wordmark, a button or the card's edge on the page's own
 * color. Reading the remaining four slots in order settles it without a
 * threshold, and finally gives `color4` a job.
 *
 * Where none of the five slots is the ground - a rolled or hand-set pair, not
 * one taken from the palette - all five stay candidates and the first four
 * stand as before.
 */
function roleColorsFrom(palette: Palette, ground: Color): readonly [Color, Color, Color, Color] {
  const members = PALETTE_SLOTS.map(slot => palette[slot].color);
  const groundHex = ground.hex("rgb");
  const withoutGround = members.filter(color => color.hex("rgb") !== groundHex);
  const roles = withoutGround.length >= 4 ? withoutGround : members;

  return [roles[0], roles[1], roles[2], roles[3]];
}
