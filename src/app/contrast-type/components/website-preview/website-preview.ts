import {Component, computed, inject} from "@angular/core";
import {Color} from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {mixColors} from "@engine/color/mix-color.helper";
import {findOptimalTextColor} from "@engine/contrast/optimal-text-color.helper";
import {Palette, PALETTE_SLOTS} from "@engine/palette/palette.model";


/**
 * The type scale, as multiples of the size the visitor set. The numbers are
 * the draft's.
 */
const HEADING_RATIO = 2.5;
const LEAD_RATIO = 1.22;
const QUOTE_RATIO = 1.3;
const BUTTON_RATIO = 0.85;
const SMALL_RATIO = 0.72;

/** A headline is never lighter than this, whatever the body weight is. */
const HEADING_MIN_WEIGHT = 500;

/** A button label is set at one weight, the way a real site's would be. */
const BUTTON_WEIGHT = 500;

/**
 * The leadings that do not follow the control: a display line sets its own,
 * and the lead paragraph rides slightly tighter than the body it introduces.
 */
const HEADING_LINE_HEIGHT = 1.1;
const QUOTE_LINE_HEIGHT = 1.35;
const LEAD_LEADING_FACTOR = 0.95;

/**
 * The fake site's own chrome, in pixels and not following `SIZE`.
 *
 * The draft draws it this way and a real site does too: a wordmark and a nav
 * link do not track the body size of the article below them. What `SIZE`
 * governs is the reading content - the headline, the lead, the body, the quote
 * and the small print - because that is the type the visitor is choosing and
 * the type the rating will judge.
 *
 * Pixels, like every font size inside the preview: the preview is the thing
 * being measured, and APCA is defined on pixel sizes. See `TypeSettings`. The
 * preview's spacing is not measured and stays on Tailwind's rem scale.
 */
const WORDMARK_SIZE = 17;
const NAV_ITEM_SIZE = 13;
const SIGN_IN_SIZE = 12;
const EYEBROW_SIZE = 10;
const CARD_LABEL_SIZE = 9;

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

const BLACK = "#000000";
const WHITE = "#FFFFFF";


interface PreviewStyle {

  readonly fontFamily: string;
  readonly monoFamily: string;

  readonly pageBackground: string;
  readonly pageColor: string;
  readonly dimColor: string;
  readonly navBackground: string;
  readonly navBorder: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly onAccent: string;
  readonly cardBackground: string;
  readonly ghostBorder: string;
  readonly footerBorder: string;

  readonly bodyWeight: number;
  readonly headingWeight: number;
  readonly buttonWeight: number;

  readonly bodyLineHeight: number;
  readonly leadLineHeight: number;
  readonly headingLineHeight: number;
  readonly quoteLineHeight: number;

  readonly bodySize: string;
  readonly headingSize: string;
  readonly leadSize: string;
  readonly buttonSize: string;
  readonly quoteSize: string;
  readonly smallSize: string;

  readonly wordmarkSize: string;
  readonly navItemSize: string;
  readonly signInSize: string;
  readonly eyebrowSize: string;
  readonly cardLabelSize: string;

}


/**
 * A page of running text set in the pair, at the size, weight and leading the
 * type controls hold.
 *
 * **Nothing in here corrects its own contrast against the pair.** The text
 * takes the text color and the page takes the background, whatever those two
 * do to each other - a preview that quietly picked a readable foreground would
 * answer the visitor's question for them. That is the one place the app's APCA
 * foreground rule does not reach; it applies to chrome the app draws on a
 * visitor color, and this is not chrome.
 *
 * The one foreground that is chosen rather than given is the label on the
 * accent button, because the accent comes from the palette and is not the pair
 * the rating judges. An unreadable label there says nothing about the pairing
 * and only looks broken.
 *
 * **The palette is read in fixed roles, not through a control.** The accent -
 * wordmark, `Sign in`, the filled button, the card's edge - the ghost
 * button's outline, the eyebrow and the card's tint are the four roles, and
 * they take their colors from `PALETTE_SLOTS` in order, skipping whichever
 * slot is also the pair's ground. So a visitor sees four of their five
 * colors on a page of text without a single selector, in a column that also
 * carries the rating, the typeface and the type controls.
 *
 * Which slot fills which role is deliberately not a setting beyond that.
 * The palette id is full, so an assignment would survive a reload but not a
 * shared link; the rating judges the pair and would say nothing about an
 * accent the visitor had just tuned; and `roleCaptionFor()` already names the
 * slots, so a second vocabulary would be a second name for the same color.
 *
 * **Skipping the ground rather than filling it in.** `color0` is also a
 * candidate for the pair's background once `PALETTE PAIR` or the initial
 * state draws the pair from the same five colors, and a role landing on the
 * ground would put the wordmark, a button or the card's edge on top of a
 * color identical to the page - not a low-contrast choice but an invisible
 * one, on about a fifth of palettes. Reading the roles from the four slots
 * that are not the ground fixes that without a threshold: `color4`, normally
 * passed over, takes a role's place exactly when its predecessor is the
 * ground. Where none of the five slots is the ground - a rolled or hand-set
 * pair, not one taken from the palette - the first four stand as before and
 * `color4` stays unused, same as ever.
 *
 * **Nothing in here is focusable or announced as a control.** The nav links,
 * `Sign in` and the two buttons are text: a focusable button that does nothing
 * is worse than no button, and a fake nav in the tab order competes with the
 * real one in the app header. The region carries a name instead, so a screen
 * reader can tell the sample page from the app around it and skip past it.
 */
@Component({
  selector: "ct-website-preview",
  templateUrl: "./website-preview.html",
  host: {
    "class": "block min-w-0"
  }
})
export class WebsitePreview {

  readonly #stateStore = inject(AppStateStore);

  protected readonly navItems = ["Notes", "Palettes", "About"];

  protected readonly style = computed<PreviewStyle>(() => {
    const {text, background} = this.#stateStore.contrastColors();
    const {fontSize, fontWeight, lineHeight} = this.#stateStore.typeSettings();
    const palette = this.#stateStore.currentPalette();

    const [accent, ghostBorderColor, accentSoft, cardTintColor] = roleColorsFrom(palette, background);
    const navTarget = background.luminance() > LIGHT_BACKGROUND_LUMINANCE ? BLACK : WHITE;

    return {
      fontFamily: this.#fontFamily(),
      monoFamily: "var(--font-mono)",

      pageBackground: hex(background),
      pageColor: hex(text),
      dimColor: hex(mixColors(text, background, DIM_MIX)),
      navBackground: hex(mixColors(background, navTarget, NAV_TINT)),
      navBorder: hex(mixColors(background, text, NAV_BORDER_MIX)),
      accent: hex(accent),
      accentSoft: hex(accentSoft),
      // Black or white, whichever APCA puts further from the accent. The
      // choice does not depend on a size, so none is passed: the button label
      // is set at a fraction of `SIZE` and has no fixed row in the table.
      onAccent: hex(findOptimalTextColor(accent).color),
      cardBackground: hex(mixColors(background, cardTintColor, CARD_TINT)),
      // A palette color rather than a mix out of the pair, so the secondary
      // action reads as a second colour of the visitor's own. Only the outline
      // depends on it: the label keeps the pair's text color, so a border that
      // sits at the page's lightness would cost the box, not the words - and
      // `roleColorsFrom()` is what keeps it off the ground in the first place.
      ghostBorder: hex(ghostBorderColor),
      footerBorder: hex(mixColors(background, text, FOOTER_BORDER_MIX)),

      bodyWeight: fontWeight,
      headingWeight: Math.max(fontWeight, HEADING_MIN_WEIGHT),
      buttonWeight: BUTTON_WEIGHT,

      bodyLineHeight: lineHeight,
      leadLineHeight: lineHeight * LEAD_LEADING_FACTOR,
      headingLineHeight: HEADING_LINE_HEIGHT,
      quoteLineHeight: QUOTE_LINE_HEIGHT,

      bodySize: px(fontSize),
      headingSize: px(Math.round(fontSize * HEADING_RATIO)),
      leadSize: px(Math.round(fontSize * LEAD_RATIO)),
      buttonSize: px(Math.round(fontSize * BUTTON_RATIO)),
      quoteSize: px(Math.round(fontSize * QUOTE_RATIO)),
      smallSize: px(Math.round(fontSize * SMALL_RATIO)),

      wordmarkSize: px(WORDMARK_SIZE),
      navItemSize: px(NAV_ITEM_SIZE),
      signInSize: px(SIGN_IN_SIZE),
      eyebrowSize: px(EYEBROW_SIZE),
      cardLabelSize: px(CARD_LABEL_SIZE)
    };
  });


  /**
   * The family the preview is set in.
   *
   * `selectedFont` is written by `commonEvents.fontSelected`, which the
   * typeface control above the sliders raises. Nothing chosen - a first visit,
   * or a cleared selection - leaves the fallback standing, so the preview runs
   * on the app's own stack rather than on an empty `font-family`.
   */
  #fontFamily(): string {
    const font = this.#stateStore.selectedFont();

    return font ? `"${font.family}", ${font.category}` : "var(--font-sans)";
  }

}


function hex(color: Color): string {
  return color.hex("rgb");
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
  const groundHex = hex(ground);
  const withoutGround = members.filter(color => hex(color) !== groundHex);
  const roles = withoutGround.length >= 4 ? withoutGround : members;

  return [roles[0], roles[1], roles[2], roles[3]];
}


function px(size: number): string {
  return `${size}px`;
}
