import chroma, {Color} from "chroma-js";
import {mixColors} from "@engine/color/mix-color.helper";
import {ContrastColors} from "@engine/contrast/contrast-colors.model";
import {findOptimalTextColor} from "@engine/contrast/optimal-text-color.helper";
import {TypeRole} from "@engine/contrast/type-role.model";
import {Palette, PALETTE_SLOTS} from "@engine/palette/palette.model";


/** The inks the sample page writes with, named after the surface they come from. */
export type SampleInk = "text" | "dim" | "accent" | "accentSoft" | "onAccent" | "onMuted" | "danger";

/** The grounds the sample page's text sits on. */
export type SampleGround = "page" | "card" | "nav" | "accent" | "muted" | "field";


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
 * `bodyText`'s role and size ratio, pulled out as a name rather than repeated
 * as a literal.
 *
 * **`bodyLink` takes the same two values, and has to keep taking them.** The
 * link is a word inside the body paragraph, not a distinct piece of text - the
 * template lets it inherit the paragraph's type instead of binding one of its
 * own, which `website-preview.spec.ts` pins. That means `bodyLink`'s entry
 * here is not read by the template at all; it only exists for the rating,
 * which does read `role` and `sizeRatio` per element. Two literal `1`s that
 * happened to match would drift silently the day `bodyText`'s ratio changes
 * for a reason of its own - one constant read by both entries can't.
 */
const BODY_TEXT_ROLE: TypeRole = "body";
const BODY_TEXT_SIZE_RATIO = 1;

/**
 * The elements of the page, in reading order.
 *
 * The size ratios are the draft's: at body 18px the lead is 22px and the small
 * print 13px, which is the caption size the draft names as where pairings fail
 * first. The nav items sit below the button size the same way a real nav
 * sits below a call to action.
 *
 * **The second half of the list is where a palette fails**, which is what the
 * page's own closing paragraph has always claimed and only now shows: a label
 * nobody can press, an error the reader has to be able to find, a caption
 * under a picture, a column of figures. They are the smallest and the weakest
 * text on the page on purpose - the disabled label is set lighter than the
 * dim ink, and the caption sits at the small print's size.
 */
export const SAMPLE_ELEMENTS: readonly SampleElement[] = [
  {key: "navActive", caption: "ACTIVE NAV ITEM", role: "ui", sizeRatio: 0.87, ink: "text", ground: "nav", figure: false},
  {key: "navItems", caption: "NAV ITEMS", role: "ui", sizeRatio: 0.87, ink: "dim", ground: "nav", figure: false},
  {key: "signIn", caption: "SIGN IN", role: "ui", sizeRatio: 0.87, ink: "accent", ground: "nav", figure: false},
  {key: "eyebrow", caption: "EYEBROW", role: "mono", sizeRatio: 1, ink: "accentSoft", ground: "page", figure: true},
  {key: "headline", caption: "HEADLINE", role: "display", sizeRatio: 1, ink: "text", ground: "page", figure: true},
  {key: "lead", caption: "LEAD", role: "body", sizeRatio: 1.22, ink: "text", ground: "page", figure: false},
  {key: "filledButton", caption: "FILLED BUTTON", role: "ui", sizeRatio: 1, ink: "onAccent", ground: "accent", figure: true},
  {key: "ghostButton", caption: "GHOST BUTTON", role: "ui", sizeRatio: 1, ink: "text", ground: "page", figure: false},
  {key: "disabledButton", caption: "DISABLED BUTTON", role: "ui", sizeRatio: 1, ink: "onMuted", ground: "muted", figure: false},
  {key: "bodyText", caption: "BODY TEXT", role: BODY_TEXT_ROLE, sizeRatio: BODY_TEXT_SIZE_RATIO, ink: "text", ground: "page", figure: true},
  {key: "bodyLink", caption: "LINK IN TEXT", role: BODY_TEXT_ROLE, sizeRatio: BODY_TEXT_SIZE_RATIO, ink: "accent", ground: "page", figure: false},
  {key: "fieldLabel", caption: "FIELD LABEL", role: "ui", sizeRatio: 0.8, ink: "accentSoft", ground: "page", figure: false},
  {key: "fieldText", caption: "FIELD TEXT", role: "body", sizeRatio: 0.89, ink: "text", ground: "field", figure: false},
  {key: "errorLine", caption: "ERROR LINE", role: "body", sizeRatio: 0.78, ink: "danger", ground: "page", figure: false},
  {key: "imageLabel", caption: "IMAGE LABEL", role: "mono", sizeRatio: 1, ink: "dim", ground: "muted", figure: false},
  {key: "imageCaption", caption: "CAPTION", role: "body", sizeRatio: 0.72, ink: "dim", ground: "page", figure: false},
  {key: "tableHeader", caption: "TABLE HEADER", role: "mono", sizeRatio: 1, ink: "accentSoft", ground: "page", figure: false},
  {key: "tableCell", caption: "TABLE CELL", role: "body", sizeRatio: 0.83, ink: "text", ground: "page", figure: false},
  {key: "tableNumber", caption: "TABLE NUMBER", role: "ui", sizeRatio: 0.87, ink: "text", ground: "page", figure: false},
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


/**
 * The ground in a sentence - `on the card`.
 *
 * The accent ground is the filled button's own fill, and the only text on it
 * is the button's label - so a name taken from the button would have the
 * rating's sentence read `Filled button on the filled button`.
 */
const GROUND_NAMES: Record<SampleGround, string> = {
  page: "the page",
  card: "the card",
  nav: "the nav bar",
  accent: "its own background",
  muted: "the disabled surface",
  field: "the form field"
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
const RULE_MIX = 0.14;
const MUTED_TINT = 0.1;
const FIELD_TINT = 0.09;

/**
 * The disabled label, as a mix from the text color towards the page - the same
 * derivation as `dim` and weaker than it, because a control nobody can press
 * is the one place a page is meant to be hard to read. It is the weakest text
 * the page carries, which is what makes it worth showing.
 */
const DISABLED_MIX = 0.55;

/**
 * Above this WCAG relative luminance the nav bar is tinted towards black, below
 * it towards white - so the bar lifts off the page in either direction rather
 * than always in one. The form field takes the same target one step further,
 * and the error line picks its red by the same split.
 */
const LIGHT_BACKGROUND_LUMINANCE = 0.4;

/**
 * The two reds the error line is written in, one per direction of page.
 *
 * **The error line is not a palette member and not derived from the pair.** A
 * red is a semantic colour: it is the one thing on the page whose meaning is
 * fixed before the visitor picks anything, so a slot would read it as
 * decoration and a mix out of the pair would stop it being red. What it *is*
 * is a colour a real design system ships in two versions, one for light
 * surfaces and one for dark, which is why there are two here and why the
 * choice runs on the ground rather than on a measurement.
 *
 * **Neither of them corrects itself against the ground.** The split says which
 * red a designer would reach for, not whether it works - a mid-lightness page
 * still gets an error line that fails, and the page is meant to show that.
 */
const DANGER_ON_LIGHT = "#A0402C";
const DANGER_ON_DARK = "#FF9E8E";

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
  /** The hairline under the footer and between the table's rows. */
  readonly rule: Color;
  /** The disabled surface: the button nobody can press, and the picture. */
  readonly muted: Color;
  readonly onMuted: Color;
  readonly field: Color;
  readonly danger: Color;

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
 * wordmark, `Sign in`, the active nav item's underline, the filled button, the
 * card's edge, the link in the running text - the ghost button's outline, the
 * eyebrow with the form label and the table's header row, and the card's tint
 * are the four roles, and they take their colors from `PALETTE_SLOTS` in
 * order, skipping whichever slot is also the pair's ground - see
 * `roleColorsFrom()`.
 *
 * **The disabled surface and the error line are neither.** A control nobody
 * can press has no brand colour, and a red means what it means before the
 * visitor picks anything: the first is mixed out of the pair like `dim`, the
 * second is one of two fixed reds - `DANGER_ON_LIGHT` says why.
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
    rule: mixColors(background, text, RULE_MIX),
    muted: mixColors(background, text, MUTED_TINT),
    onMuted: mixColors(text, background, DISABLED_MIX),
    // The nav's target one step further: the bar recedes and the field sinks
    // with it, so a page reads as one surface with two wells in it rather
    // than as a light bar over a dark field on one visitor's colours and the
    // other way round on the next one's.
    field: mixColors(background, navTarget, FIELD_TINT),
    danger: chroma(background.luminance() > LIGHT_BACKGROUND_LUMINANCE ? DANGER_ON_LIGHT : DANGER_ON_DARK)
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
