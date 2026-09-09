import chroma, {Color} from "chroma-js";
import {mixColors} from "@engine/color/mix-color.helper";
import {ContrastColors} from "@engine/contrast/contrast-colors.model";
import {findOptimalTextColor} from "@engine/contrast/optimal-text-color.helper";
import {TypeRole} from "@engine/contrast/type-role.model";
import {Palette, PALETTE_SLOTS} from "@engine/palette/palette.model";
import {ChipSource, colorOf} from "@contrast-type/models/chip-source.model";


/**
 * The inks the sample page writes with, named after the surface they come
 * from - all but `onAccent`, which names no surface: it is a foreground
 * computed from whatever the element is written on, and `inkOf()` is where
 * that happens. Do not put it back into `SamplePageColors`; a field there
 * could only be right for one ground.
 */
export type SampleInk = "text" | "dim" | "accent" | "accentSoft" | "onAccent" | "onMuted" | "danger";

/** The grounds the sample page's text sits on. */
export type SampleGround = "page" | "card" | "nav" | "accent" | "muted" | "field";

/** Which of an element's two colours a placed chip replaces. */
export type SamplePlacement = "ink" | "ground";


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
  /**
   * Which of the element's two colours a placed chip replaces.
   *
   * `ink` wherever the ink is the visitor's own. `ground` for the three inks
   * the app computes for itself: `onAccent` is whichever of black or white
   * APCA puts further from the accent, `onMuted` is a fixed mix off the pair,
   * and `danger` is one of two constants picked by the page's lightness.
   * Handing one of those three a palette colour would throw away a value the
   * app derived for a reason, so on those elements the lever is the ground -
   * the filled button takes a colour as its fill and keeps its computed
   * label, the error line takes one as the surface it sits on.
   *
   * **This field is also what decides whether a nearest-colour row is worth
   * offering** - see `verdictFacts()`. Do not spell the three computed inks
   * out a second time anywhere: two lists drift the day a fourth is added.
   */
  readonly placement: SamplePlacement;

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
  {key: "navActive", caption: "ACTIVE NAV ITEM", role: "ui", sizeRatio: 0.87, ink: "text", ground: "nav", figure: false, placement: "ink"},
  {key: "navItems", caption: "NAV ITEMS", role: "ui", sizeRatio: 0.87, ink: "dim", ground: "nav", figure: false, placement: "ink"},
  {key: "signIn", caption: "SIGN IN", role: "ui", sizeRatio: 0.87, ink: "accent", ground: "nav", figure: false, placement: "ink"},
  {key: "eyebrow", caption: "EYEBROW", role: "mono", sizeRatio: 1, ink: "accentSoft", ground: "page", figure: true, placement: "ink"},
  {key: "headline", caption: "HEADLINE", role: "display", sizeRatio: 1, ink: "text", ground: "page", figure: true, placement: "ink"},
  {key: "lead", caption: "LEAD", role: "body", sizeRatio: 1.22, ink: "text", ground: "page", figure: false, placement: "ink"},
  {key: "filledButton", caption: "FILLED BUTTON", role: "ui", sizeRatio: 1, ink: "onAccent", ground: "accent", figure: true, placement: "ground"},
  {key: "ghostButton", caption: "GHOST BUTTON", role: "ui", sizeRatio: 1, ink: "text", ground: "page", figure: false, placement: "ink"},
  {key: "disabledButton", caption: "DISABLED BUTTON", role: "ui", sizeRatio: 1, ink: "onMuted", ground: "muted", figure: false, placement: "ground"},
  {key: "bodyText", caption: "BODY TEXT", role: BODY_TEXT_ROLE, sizeRatio: BODY_TEXT_SIZE_RATIO, ink: "text", ground: "page", figure: true, placement: "ink"},
  {key: "bodyLink", caption: "LINK IN TEXT", role: BODY_TEXT_ROLE, sizeRatio: BODY_TEXT_SIZE_RATIO, ink: "accent", ground: "page", figure: false, placement: "ink"},
  {key: "fieldLabel", caption: "FIELD LABEL", role: "ui", sizeRatio: 0.8, ink: "accentSoft", ground: "page", figure: false, placement: "ink"},
  {key: "fieldText", caption: "FIELD TEXT", role: "body", sizeRatio: 0.89, ink: "text", ground: "field", figure: false, placement: "ink"},
  {key: "errorLine", caption: "ERROR LINE", role: "body", sizeRatio: 0.78, ink: "danger", ground: "page", figure: false, placement: "ground"},
  {key: "imageLabel", caption: "IMAGE LABEL", role: "mono", sizeRatio: 1, ink: "dim", ground: "muted", figure: false, placement: "ink"},
  {key: "imageCaption", caption: "CAPTION", role: "body", sizeRatio: 0.72, ink: "dim", ground: "page", figure: false, placement: "ink"},
  {key: "tableHeader", caption: "TABLE HEADER", role: "mono", sizeRatio: 1, ink: "accentSoft", ground: "page", figure: false, placement: "ink"},
  {key: "tableCell", caption: "TABLE CELL", role: "body", sizeRatio: 0.83, ink: "text", ground: "page", figure: false, placement: "ink"},
  {key: "tableNumber", caption: "TABLE NUMBER", role: "ui", sizeRatio: 0.87, ink: "text", ground: "page", figure: false, placement: "ink"},
  {key: "cardLabel", caption: "CARD LABEL", role: "mono", sizeRatio: 0.9, ink: "dim", ground: "card", figure: false, placement: "ink"},
  {key: "quote", caption: "PULL QUOTE", role: "body", sizeRatio: 1.3, ink: "text", ground: "card", figure: false, placement: "ink"},
  {key: "smallPrint", caption: "SMALL PRINT", role: "body", sizeRatio: 0.72, ink: "dim", ground: "page", figure: false, placement: "ink"}
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
 * Every surface the sample page is drawn in, derived from the pair and the
 * palette.
 *
 * Inks and grounds are `Color`s rather than hex strings, because the rating
 * measures them and the preview paints them - one derivation for both, so the
 * figure is about the page the visitor sees.
 *
 * **Every field here is a colour of the page, not of one element.** `nav` is
 * three elements, `muted` is the disabled button and the picture. What one
 * element alone is written in belongs in `inkOf()`, which is also the only
 * place that can see the ground the element ended up with.
 */
export interface SamplePageColors {

  readonly page: Color;
  readonly text: Color;
  readonly dim: Color;
  readonly nav: Color;
  readonly navBorder: Color;
  readonly accent: Color;
  readonly accentSoft: Color;
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
 * answer the visitor's question for them.
 *
 * **The one foreground that is chosen rather than given is not here.** The
 * label on the filled button is computed in `inkOf()` instead, because it
 * follows the ground the button actually has and this function cannot see
 * which element it is deriving for. `onMuted` and `danger` stay here and stay
 * uncorrected on purpose - see their own comments; do not "fix" those two the
 * way the label is fixed, because a disabled control and a red are meant to
 * fail where the page makes them fail.
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


/**
 * The chip a visitor put on an element, per `SAMPLE_ELEMENTS` key. An element
 * nobody has placed a colour on is absent.
 *
 * **A source, never a hex.** The placement is about the chip it came off, not
 * about the colour that chip happens to hold, so repainting the palette hands
 * the element the new colour of the same slot for free - and a placement made
 * from `T` or `BG` follows the pair the same way. A stored hex would freeze the
 * element at the palette and the pair it was placed in.
 */
export type ElementPlacements = Readonly<Record<string, ChipSource | undefined>>;


/**
 * The page as it is drawn and as it is measured: every derived surface, and
 * the colour a placement put on an element.
 *
 * One value rather than two arguments, because every reader needs both - a
 * reader handed only the surfaces would draw and measure a page the visitor
 * is not looking at, and the preview, the rating, the tally and the marks all
 * have to agree about the same page.
 */
export interface SamplePage {

  readonly colors: SamplePageColors;
  /** The placed colour per element key; absent where nothing was placed. */
  readonly placed: Readonly<Record<string, Color | undefined>>;

}


/**
 * The page from the pair, the palette and what the visitor placed.
 *
 * The sources are resolved against this pair and this palette here and nowhere
 * else - through `colorOf()` - which is what makes a palette change move every
 * placed element at once and a new background move the ones placed from `BG`. A
 * placement is only ever read back out through `inkOf()` and `groundOf()`.
 */
export function samplePage(pair: ContrastColors,
                           palette: Palette,
                           placements: ElementPlacements): SamplePage {
  const placed: Record<string, Color> = {};

  for (const [key, source] of Object.entries(placements)) {
    if (source) placed[key] = colorOf(source, pair, palette);
  }

  return {colors: samplePageColors(pair, palette), placed};
}


/**
 * The color an element is written in.
 *
 * **`onAccent` is measured against the ground the element ended up with, not
 * against the accent surface.** It is the one foreground this page chooses
 * rather than takes: black or white, whichever APCA puts further from what
 * the button is filled with. Read off a surface it would stay the white that
 * suited the accent while a visitor filled the button with gold, and the
 * label would be unreadable through no choice of theirs that a nearest-colour
 * row could undo - `verdictFacts()` offers none where the ink is not the
 * visitor's. That is the guarantee this ink exists for, so it has to be
 * computed where the element and its ground meet, which is here.
 *
 * The choice does not depend on a size, so none is passed: the button label
 * is set at a share of the UI size and has no fixed row in the table.
 *
 * **`onMuted` and `danger` are not treated this way, and must not be.** Their
 * comments in `samplePageColors()` declare the missing correction as the
 * point: a control nobody can press and a red that means what it means are
 * meant to fail where the page makes them fail.
 */
export function inkOf(element: SampleElement, page: SamplePage): Color {
  const placed = placedOn(element, "ink", page);

  if (placed) return placed;
  if (element.ink === "onAccent") return findOptimalTextColor(groundOf(element, page)).color;

  return page.colors[element.ink];
}


/** The color an element sits on. */
export function groundOf(element: SampleElement, page: SamplePage): Color {
  return placedOn(element, "ground", page) ?? page.colors[element.ground];
}


/**
 * The colour a placement put on this side of this element, or nothing.
 *
 * **This is the only place a placement is applied.** The preview paints it,
 * the rating measures it, the tally counts it and the marks judge it, and all
 * four reach it through `inkOf()` and `groundOf()` - a reader that resolved a
 * slot of its own would be a second answer about the same element. Which side
 * a placement lands on is `SampleElement.placement`.
 *
 * **A placement applies to its own element and to nothing else**, which is why
 * it is not a field of `SamplePageColors`: `muted` is both the disabled button
 * and the picture, `nav` is three elements, and a ground rewritten there would
 * move all of them.
 */
function placedOn(element: SampleElement,
                  side: SamplePlacement,
                  page: SamplePage): Color | undefined {
  return element.placement === side ? page.placed[element.key] : undefined;
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
