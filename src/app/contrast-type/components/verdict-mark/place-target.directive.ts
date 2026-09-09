import {computed, Directive, inject, input} from "@angular/core";
import {Color} from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {findOptimalTextColor} from "@engine/contrast/optimal-text-color.helper";
import {SampleGround, samplePage} from "@contrast-type/models/sample-page.model";
import {missedRequirement, verdictFor} from "@contrast-type/models/element-verdict.model";
import {PlacementGesture} from "@contrast-type/services/placement-gesture.service";


/**
 * An occurrence of a named element that has no mark of its own: it answers a
 * chip released on it, and it draws the outline that says so.
 *
 * **One mark per named element, but a drop target per occurrence.** Five of the
 * page's elements appear more than once - the running text in three
 * paragraphs, the small print beside the copyright line, and each of the
 * table's three roles in a cell per column or per row - and a mark wraps
 * exactly one of them. Without this the biggest block of text on the page
 * offered a visitor nothing and answered a release with a cancel, and the
 * block they had aimed at then recoloured from a placement made somewhere
 * else. A second mark would have been the other way out and is the wrong one:
 * it would count the page twice in the tally, in the ledger and in the tab
 * order. So the mark stays where it is, and every other occurrence carries
 * this.
 *
 * **It is chrome and nothing else.** No badge, no button, no name, no tab
 * stop: the element's one control is its mark, and this adds no second thing
 * to press or to hear. What it adds is the outline while a chip is in hand and
 * the failing element's own dotted underline - the two things drawn *on* the
 * element rather than beside it.
 *
 * **The verdict is read, never recomputed.** `verdictFor()` is the one place
 * that says how an element fares, and this is a fifth reader of it beside the
 * mark, the tally, the rating and the ledger - which is what makes the outline
 * here the same colour as the outline on the marked occurrence rather than a
 * second opinion about one element.
 *
 * **Keep this in step with `VerdictMark`'s own chrome.** The two draw one
 * element and a visitor sees them side by side: change when the mark outlines
 * an element - `named()` there - and change it here, or one paragraph of the
 * running text will offer itself while the next one does not.
 *
 * **It splits the same way the mark does.** A release in the upper half takes
 * the element's text colour and one in the lower half its ground, and the
 * hairline that says so is drawn off `data-place-sides` - the one attribute
 * `src/styles.css` and `PlacementGesture` both run off. Here the attribute is
 * on the directive's own element, which is the outlined box as well, so the
 * line and the measurement are the same box without further ado.
 *
 * **What it cannot carry is the word.** The side travels in the mark's badge,
 * and an occurrence with no badge has nowhere to put it - so a visitor learns
 * which half is which on the one occurrence that is marked, or from the
 * chooser, which asks outright. Giving the directive a badge of its own would
 * be the second name per element that the rule above forbids.
 *
 * **It answers a carried chip and nothing else - no hover, unlike the mark.**
 * The mark outlines *and names* its element under the pointer, and a name is
 * what makes that outline mean something; an occurrence with no badge would
 * put an unlabelled box under the cursor of somebody who is only reading. So
 * at rest the page is exactly as it was, and the moment a chip is in hand
 * every occurrence outlines itself - which is the moment it is being asked.
 * The marked occurrence carries the one name, and the outlines say where it
 * applies. There is no focus listener either: nothing inside an unmarked
 * occurrence is focusable.
 */
@Directive({
  selector: "[ctPlaceTarget]",
  host: {
    "[attr.data-place-target]": "elementKey()",
    "class": "outline-offset-4",
    "[class.outline-2]": "named()",
    "[class.outline-dashed]": "dashed()",
    "[attr.data-place-sides]": "named() ? '' : null",
    "[style.--place-split-color]": "splitHex()",
    "[style.outline-color]": "inkHex()",
    "[class.underline]": "missed()",
    "[class.decoration-dotted]": "missed()",
    "[class.underline-offset-4]": "missed()"
  }
})
export class PlaceTarget {

  readonly #stateStore = inject(AppStateStore);
  readonly #gesture = inject(PlacementGesture);

  /** The `SAMPLE_ELEMENTS` key of the element this occurrence belongs to. */
  readonly elementKey = input.required<string>({alias: "ctPlaceTarget"});

  /**
   * The page surface this occurrence sits on, for the reason `VerdictMark`
   * gives for its own input: it decides what the outline is drawn in, and it
   * has to match the mark's - the marked occurrence and this one are one
   * element and must not be outlined in two colours.
   */
  readonly surface = input<SampleGround | null>(null);

  readonly #page = computed(() => samplePage(
    this.#stateStore.contrastColors(),
    this.#stateStore.currentPalette(),
    this.#stateStore.placements()
  ));

  readonly #verdict = computed(() => verdictFor(
    this.elementKey(),
    this.#page(),
    this.#stateStore.typeRoles()
  ));

  readonly #surfaceColor = computed<Color>(() => {
    const surface = this.surface();

    return surface === null ? this.#verdict().ground : this.#page().colors[surface];
  });

  /**
   * Black or white, whichever APCA puts further from the surface - the app's
   * chrome on a colour the visitor picked, so a neutral token is guaranteed
   * against none of it.
   */
  protected readonly inkHex = computed(() =>
    findOptimalTextColor(this.#surfaceColor()).color.hex("rgb"));

  /**
   * The hairline's own colour, measured against the element's ground rather
   * than against the surface - `VerdictMark.splitHex` says why the one line
   * drawn inside the box cannot take the colour the outline around it takes.
   */
  protected readonly splitHex = computed(() =>
    findOptimalTextColor(this.#verdict().ground).color.hex("rgb"));

  protected readonly missed = computed(() => missedRequirement(this.#verdict()));

  /** Every occurrence at once while a chip is carried, and none of them at rest. */
  protected readonly named = computed(() => this.#gesture.carrying());

  /** Solid names the drop; dashed only offers it. */
  protected readonly dashed = computed(() =>
    this.named() && this.#gesture.over() !== this.elementKey());

}
