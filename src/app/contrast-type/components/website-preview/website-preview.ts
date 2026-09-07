import {Component, computed, inject} from "@angular/core";
import {Color} from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {fontFamilyFor, TypeRolesMap} from "@common/models/type-role-settings.model";
import {sampleElement, samplePageColors} from "@contrast-type/models/sample-page.model";
import {elementFontSize} from "@contrast-type/models/element-verdict.model";
import {VerdictMark} from "@contrast-type/components/verdict-mark/verdict-mark";


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

/**
 * The table's columns. `number` right-aligns the column, which is what makes
 * a column of figures read as a column.
 */
const TABLE_COLUMNS: readonly {readonly caption: string; readonly number: boolean}[] = [
  {caption: "ELEMENT", number: false},
  {caption: "SIZE", number: true},
  {caption: "WEIGHT", number: true}
];

/**
 * The elements the table reports on, and the names it calls them by.
 *
 * **The table is about this page.** Sample figures would contradict the
 * sliders the moment one of them moved - a display role set to 96 beside a
 * table still saying 44 reads as a bug, not as sample copy - so the numbers
 * are the ones the page is actually set in.
 */
const TABLE_ELEMENTS: readonly {readonly key: string; readonly element: string}[] = [
  {key: "headline", element: "Headline"},
  {key: "bodyText", element: "Body"},
  {key: "imageCaption", element: "Caption"}
];


/** One row of the table: the element it names, then its figures. */
interface TableRow {

  readonly element: string;
  readonly values: readonly number[];

}


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
  readonly rule: string;
  readonly mutedBackground: string;
  readonly onMuted: string;
  readonly fieldBackground: string;
  readonly danger: string;

  readonly wordmarkSize: string;

  readonly navActive: ElementType;
  readonly navItems: ElementType;
  readonly signIn: ElementType;
  readonly eyebrow: ElementType;
  readonly headline: ElementType;
  readonly lead: ElementType;
  readonly filledButton: ElementType;
  readonly ghostButton: ElementType;
  readonly disabledButton: ElementType;
  readonly bodyText: ElementType;
  readonly fieldLabel: ElementType;
  readonly fieldText: ElementType;
  readonly errorLine: ElementType;
  readonly imageLabel: ElementType;
  readonly imageCaption: ElementType;
  readonly tableHeader: ElementType;
  readonly tableCell: ElementType;
  readonly tableNumber: ElementType;
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
 * **No sample content in here is focusable or announced as a control.** The
 * nav links, `Sign in`, the three buttons and the form field are text: a
 * focusable button that does nothing is worse than no button, a fake nav in
 * the tab order competes with the real one in the app header, and an input
 * here would swallow keystrokes meant for the app. The field's focus ring is
 * drawn rather than reached. The region carries a name instead, so a screen
 * reader can tell the sample page from the app around it and skip past it.
 *
 * **The marks are the exception, and they are the only one.** Every element
 * carries a `ct-verdict-mark` in front of it - a control, focusable, named
 * after the element and its verdict, opening the reasons in words. They are
 * the first focus stops inside the preview because they are the only ones. An
 * element that appears more than once - the running text, the nav items, the
 * table's cells, the small print - gets one mark, because one ink on one
 * ground at one size is one verdict.
 *
 * **A verdict opens as a popup on the body, so nothing here moves.** That is
 * also what lets the table's three marks sit inside its cells: a block in a
 * `<td>` re-apportioned the columns every time it opened. `VerdictMark` says
 * the rest.
 */
@Component({
  selector: "ct-website-preview",
  imports: [VerdictMark],
  templateUrl: "./website-preview.html",
  host: {
    "class": "block min-w-0"
  }
})
export class WebsitePreview {

  readonly #stateStore = inject(AppStateStore);

  /**
   * The nav items after the active one. `Notes` is set apart in the template
   * because it carries the accent underline and the page's own text colour -
   * the state a nav has to show without relying on the colour alone.
   */
  protected readonly navItems = ["Palettes", "About"];

  protected readonly tableColumns = TABLE_COLUMNS;

  protected readonly tableRows = computed<readonly TableRow[]>(() => {
    const roles = this.#stateStore.typeRoles();

    return TABLE_ELEMENTS.map(({key, element}) => {
      const sample = sampleElement(key);

      return {
        element,
        values: [elementFontSize(sample, roles), roles[sample.role].settings.fontWeight]
      };
    });
  });

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
      rule: hex(colors.rule),
      mutedBackground: hex(colors.muted),
      onMuted: hex(colors.onMuted),
      fieldBackground: hex(colors.field),
      danger: hex(colors.danger),

      wordmarkSize: px(WORDMARK_SIZE),

      navActive: elementType("navActive", roles),
      navItems: elementType("navItems", roles),
      signIn: elementType("signIn", roles),
      eyebrow: elementType("eyebrow", roles),
      headline: elementType("headline", roles),
      lead: elementType("lead", roles, LEAD_LEADING_FACTOR),
      filledButton: elementType("filledButton", roles),
      ghostButton: elementType("ghostButton", roles),
      disabledButton: elementType("disabledButton", roles),
      bodyText: elementType("bodyText", roles),
      fieldLabel: elementType("fieldLabel", roles),
      fieldText: elementType("fieldText", roles),
      errorLine: elementType("errorLine", roles),
      imageLabel: elementType("imageLabel", roles),
      imageCaption: elementType("imageCaption", roles),
      tableHeader: elementType("tableHeader", roles),
      tableCell: elementType("tableCell", roles),
      tableNumber: elementType("tableNumber", roles),
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
    // Through `elementFontSize()`, which is also what the verdict looks up in
    // the APCA table: the mark beside an element has to be about the size the
    // element is drawn at, and two roundings of the same product would drift.
    fontSize: px(elementFontSize(element, roles)),
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
