import {Component, computed, inject} from "@angular/core";
import {Color} from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {fontFamilyFor, TypeRolesMap} from "@common/models/type-role-settings.model";
import {sampleElement, samplePageColors} from "@contrast-type/models/sample-page.model";


/**
 * The leadings that do not take the role's value as it is: the lead paragraph
 * rides slightly tighter than the body it introduces, and the quote tighter
 * still, both as a share of body text's leading so the slider still moves
 * them.
 */
const LEAD_LEADING_FACTOR = 0.95;
const QUOTE_LEADING_FACTOR = 0.85;

/**
 * The fake site's wordmark, in pixels and not following any role.
 *
 * The draft draws it this way and a real site does too: a wordmark does not
 * track the type of the article below it. It is the one piece of text on the
 * page outside the four roles, and the rating leaves it alone for the same
 * reason.
 *
 * Pixels, like every font size inside the preview: the preview is the thing
 * being measured, and APCA is defined on pixel sizes. See `TypeSettings`. The
 * preview's spacing is not measured and stays on Tailwind's rem scale.
 */
const WORDMARK_SIZE = 17;


/** The type one element is set in, ready for the style bindings. */
interface ElementType {

  readonly fontFamily: string;
  readonly fontSize: string;
  readonly fontWeight: number;
  readonly lineHeight: number;

}


interface PreviewStyle {

  /** Body text's face, on the page itself, so the wordmark inherits it. */
  readonly fontFamily: string;

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

  readonly wordmarkSize: string;

  readonly navItems: ElementType;
  readonly signIn: ElementType;
  readonly eyebrow: ElementType;
  readonly headline: ElementType;
  readonly lead: ElementType;
  readonly filledButton: ElementType;
  readonly ghostButton: ElementType;
  readonly bodyText: ElementType;
  readonly cardLabel: ElementType;
  readonly quote: ElementType;
  readonly smallPrint: ElementType;

}


/**
 * A page of sample copy set in the pair, in the four type roles at the faces,
 * sizes, weights and leadings the type controls hold.
 *
 * **Every element takes its type from its role.** Which role that is, and at
 * what share of the role's size the element is set, is `SAMPLE_ELEMENTS` in
 * `sample-page.model.ts` - the same list the rating measures, so the figure
 * in the left column is about the page on the right. Nothing in here derives
 * one role from another: the headline's weight is the display role's, not a
 * step up from body text's, so a display face that ships one weight is set in
 * that weight rather than in a synthesised semibold.
 *
 * **The colors come from `samplePageColors()`**, for the same reason: the
 * rating measures the inks and grounds the page is drawn in, and one
 * derivation keeps the two from drifting apart. Its comment says why the pair
 * is painted as it is and how the palette is read.
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
    const colors = samplePageColors(this.#stateStore.contrastColors(), this.#stateStore.currentPalette());
    const roles = this.#stateStore.typeRoles();

    return {
      fontFamily: fontFamilyFor("body", roles.body.font),

      pageBackground: hex(colors.page),
      pageColor: hex(colors.text),
      dimColor: hex(colors.dim),
      navBackground: hex(colors.nav),
      navBorder: hex(colors.navBorder),
      accent: hex(colors.accent),
      accentSoft: hex(colors.accentSoft),
      onAccent: hex(colors.onAccent),
      cardBackground: hex(colors.card),
      ghostBorder: hex(colors.ghostBorder),
      footerBorder: hex(colors.footerBorder),

      wordmarkSize: px(WORDMARK_SIZE),

      navItems: elementType("navItems", roles),
      signIn: elementType("signIn", roles),
      eyebrow: elementType("eyebrow", roles),
      headline: elementType("headline", roles),
      lead: elementType("lead", roles, LEAD_LEADING_FACTOR),
      filledButton: elementType("filledButton", roles),
      ghostButton: elementType("ghostButton", roles),
      bodyText: elementType("bodyText", roles),
      cardLabel: elementType("cardLabel", roles),
      quote: elementType("quote", roles, QUOTE_LEADING_FACTOR),
      smallPrint: elementType("smallPrint", roles)
    };
  });

}


/**
 * The type an element is set in: its role's face, weight and leading, and
 * the role's size at the element's share of it.
 */
function elementType(key: string, roles: TypeRolesMap, leadingFactor = 1): ElementType {
  const element = sampleElement(key);
  const {font, settings} = roles[element.role];

  return {
    fontFamily: fontFamilyFor(element.role, font),
    fontSize: px(Math.round(settings.fontSize * element.sizeRatio)),
    fontWeight: settings.fontWeight,
    lineHeight: settings.lineHeight * leadingFactor
  };
}


function hex(color: Color): string {
  return color.hex("rgb");
}


function px(size: number): string {
  return `${size}px`;
}
