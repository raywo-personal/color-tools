import {afterRenderEffect, Component, computed, effect, ElementRef, inject, input, linkedSignal, model, signal, viewChild, viewChildren} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {getRegularFont, GoogleFont, SelectedFont} from "@common/models/google-font.model";
import {GoogleFontsService} from "@common/services/google-fonts.service";


/** Distinguishes the label, the listbox and the options, once per instance. */
let nextInstance = 0;

/**
 * How many families the list offers at once.
 *
 * The same number for a search and for the idle list, and the same the service
 * caps its own results at. The catalog holds well over a thousand families, so
 * the list is a window on it either way - twenty is what fits a dropdown a
 * visitor scans rather than reads.
 */
const RESULT_LIMIT = 20;

/**
 * The family the app sets itself in, and the one the preview falls back to.
 *
 * A copy of the first name in `--font-sans` in `src/styles.css`, which no
 * compiler compares against this. `font-picker.spec.ts` reads the stylesheet
 * and pins the two together - the field can be empty, and a visitor is then
 * owed the name of the type they are actually looking at.
 */
const APP_TYPE_FAMILY = "IBM Plex Sans";


/** One row of the listbox, with the id its `aria-activedescendant` needs. */
interface FontOption {

  readonly id: string;
  readonly font: GoogleFont;
  readonly family: string;
  readonly category: string;

}


/**
 * The typeface, as a combobox over the Google Fonts catalog.
 *
 * The draft draws a `<select>` with eight families. The catalog has well over a
 * thousand, so this is a search: a text field with `role="combobox"` over a
 * `role="listbox"`, which is the pattern that gets a filtered list into the
 * accessibility tree at all.
 *
 * **The keyboard lives on the field, not on the options.** Arrow keys move
 * `aria-activedescendant` through the list while focus stays in the field,
 * Enter takes the active family, Escape closes. That is what the pattern asks
 * for, and it is why the options carry neither focus nor key handlers - the
 * one place the click rule has to be waived, in the template.
 *
 * **Typing opens the list on its best hit.** The top row is active from the
 * first keystroke, so Enter takes it and the arrows move on from there. The
 * alternative - a list open with nothing active - costs an extra ArrowDown for
 * the family the visitor was already typing out, and leaves the highlighted
 * row and the announced row disagreeing while they do it.
 *
 * **The control is dumb about where the selection goes.** It takes a
 * `SelectedFont` and reports one; the screen that hosts it decides what the
 * store does with it. So the catalog request lives here and the store wiring
 * does not.
 *
 * **The family in use is named under the field, whatever the field says.** The
 * field is a query as much as a selection, and after a clear it is empty - so
 * on its own it never reliably answers "what am I looking at".
 *
 * **A catalog that does not answer says so and offers the request again.** The
 * proxy behind `environment.webFontsApiUrl` can be down and a visitor can be
 * offline. Without the list nothing can be looked up, so the field is disabled
 * rather than left accepting input that can never match - but a family chosen
 * earlier stays chosen: its stylesheet comes from `fonts.googleapis.com`, not
 * from this catalog, so the preview keeps it.
 */
@Component({
  selector: "ct-font-picker",
  imports: [FormsModule],
  templateUrl: "./font-picker.html",
  host: {
    "class": "block"
  }
})
export class FontPicker {

  readonly #fonts = inject(GoogleFontsService);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>("field");
  private readonly optionElements = viewChildren<ElementRef<HTMLElement>>("option");

  /** The caption above the field, and what the field is announced by. */
  readonly label = input("TYPEFACE");

  readonly font = model<SelectedFont | null>(null);

  protected readonly instance = nextInstance++;
  protected readonly fieldId = `ct-font-picker-${this.instance}`;
  protected readonly listId = `${this.fieldId}-list`;
  protected readonly usageId = `${this.fieldId}-usage`;

  protected readonly catalog = this.#fonts.googleFonts;

  protected readonly loading = computed(() => this.catalog.isLoading());

  protected readonly failed = computed(() => this.catalog.error() !== undefined);

  /** Only a catalog that arrived can be searched. */
  protected readonly ready = computed(() => !this.loading() && !this.failed());

  /**
   * The field's `disabled`, as an attribute rather than through `ngModel`.
   *
   * `NgModel` claims `disabled` as an input of its own and applies it in a
   * microtask, so the element is still disabled when the render hooks run -
   * and `focus()` on a disabled input does nothing, which is exactly what the
   * retry below needs to work. Nothing here uses a form control's disabled
   * state, so the attribute is the whole of it.
   */
  protected readonly fieldDisabled = computed(() => this.ready() ? null : true);

  /**
   * What the field shows.
   *
   * Linked to the selection, so a family taken from the list, a clear and a
   * value arriving from anywhere else all put the field right. While the
   * visitor types it holds their query instead, until the next selection.
   */
  protected readonly query = linkedSignal(() => this.font()?.family ?? "");

  protected readonly open = signal(false);

  /**
   * Set from the moment TRY AGAIN is pressed until the catalog answers.
   *
   * The visitor who pressed the button is standing on it while the request is
   * out, and `failed` goes false the moment the request is retried - so
   * without this the button would leave the document under their focus and
   * take them to the top of the page.
   */
  protected readonly retrying = signal(false);

  protected readonly options = computed<FontOption[]>(() => {
    if (!this.ready()) return [];

    // A field showing the chosen family is not a search for it: reopening the
    // list would otherwise offer that one family and nothing else, and a
    // visitor changing their mind would have to empty the field first.
    const typed = this.query().trim();
    const query = typed === this.font()?.family ? "" : typed;
    const fonts = query
      ? this.#fonts.searchFonts(query, RESULT_LIMIT)
      : this.catalog.value()?.items.slice(0, RESULT_LIMIT) ?? [];

    return fonts.map((font, index) => ({
      id: `${this.listId}-option-${index}`,
      font,
      family: font.family,
      category: font.category
    }));
  });

  /**
   * The row the arrow keys stand on.
   *
   * Reset to the top whenever the list changes, because the row that was
   * active is not the same family after another keystroke - and a stale index
   * would point `aria-activedescendant` at a row that is gone.
   */
  protected readonly activeIndex = linkedSignal<FontOption[], number>({
    source: this.options,
    computation: () => 0
  });

  protected readonly activeOption = computed(() => this.options()[this.activeIndex()]);

  /**
   * Whether there is a list on screen.
   *
   * A query nobody in the catalog matches leaves the popup unrendered, so
   * `open` alone must not reach `aria-expanded`: it would announce a list that
   * is not there and point `aria-controls` at an element that does not exist.
   */
  protected readonly listOpen = computed(() => this.open() && this.options().length > 0);

  /** Null while no list is on screen: an active row nobody can see is a lie. */
  protected readonly activeId = computed(() =>
    this.listOpen() ? this.activeOption()?.id ?? null : null
  );

  /**
   * The family the preview is actually set in.
   *
   * Always on screen, and the field is described by it. The field alone cannot
   * carry this: it holds a query as much as a selection, so it reads `merri`
   * while Lobster is still what the preview uses - and after a clear it is
   * empty, where the app's own type is doing the work and nothing said so.
   */
  protected readonly usageText = computed(() => {
    const family = this.font()?.family;

    return family
      ? `Set in ${family}.`
      : `Set in ${APP_TYPE_FAMILY}, the app's own type.`;
  });

  protected readonly statusText = computed(() => {
    if (this.loading()) return "Loading the font catalog …";
    if (this.failed()) return "The font catalog is unavailable, so no family can be looked up.";

    // Nothing else would say so: the popup simply stays away, and a visitor
    // typing a family the catalog does not carry is left waiting for a list.
    if (this.open() && this.options().length === 0) return "No family matches that search.";

    return "";
  });


  constructor() {
    // The list scrolls, so the row the arrow keys stand on has to be brought
    // along - `aria-activedescendant` moves the announcement but not the
    // viewport, and past the sixth row a keyboard visitor would be walking a
    // list they can no longer see. `nearest` so the page around it stays put.
    effect(() => {
      const index = this.activeIndex();

      if (!this.open()) return;

      this.optionElements()[index]?.nativeElement.scrollIntoView?.({block: "nearest"});
    });

    // A retry that worked takes the button away with it, so the focus of the
    // visitor who pressed it has to go somewhere first - and the field is
    // where they were headed anyway. After the render rather than in a plain
    // effect: the field still carries `disabled` at that point, and `focus()`
    // on a disabled input does nothing.
    afterRenderEffect(() => {
      if (!this.retrying() || !this.ready()) return;

      this.field().nativeElement.focus();
      this.retrying.set(false);
    });
  }


  /** A click into the field offers the list, the way a select would. */
  protected openList(): void {
    this.open.set(true);
    this.selectQuery();
  }


  /**
   * Puts the family in the field under the next keystroke.
   *
   * The field mirrors the selection, so typing into it would otherwise append
   * to the family already there - "Lobster" plus an "m" matches nothing, and
   * the visitor has to empty the field by hand before they can look for their
   * second typeface.
   */
  protected selectQuery(): void {
    this.field().nativeElement.select();
  }


  protected queryTyped(value: string): void {
    this.query.set(value);
    this.open.set(true);
  }


  /**
   * Everything the combobox answers to.
   *
   * One handler rather than a `keydown.x` binding per key, because half of
   * them have to stop the browser's own answer - the arrows would move the
   * caret, Enter would submit - and that decision belongs beside the one that
   * uses the key.
   */
  protected onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        this.#move(1);
        break;

      case "ArrowUp":
        event.preventDefault();
        this.#move(-1);
        break;

      case "Home":
        if (!this.open()) return;
        event.preventDefault();
        this.activeIndex.set(0);
        break;

      case "End":
        if (!this.open()) return;
        event.preventDefault();
        this.activeIndex.set(this.options().length - 1);
        break;

      case "Enter": {
        const option = this.open() ? this.activeOption() : undefined;
        if (!option) return;
        event.preventDefault();
        this.select(option);
        break;
      }

      case "Escape":
        event.preventDefault();
        this.close();
        break;

      default:
        break;
    }
  }


  protected select(option: FontOption): void {
    this.font.set(getRegularFont(option.font));
    this.open.set(false);
  }


  /**
   * Closes the list and puts the selection back into the field.
   *
   * Both on Escape and on blur: the field mirrors the selection, so it must
   * never be left showing a query the app is not using.
   */
  protected close(): void {
    this.open.set(false);
    this.query.set(this.font()?.family ?? "");
  }


  /**
   * Keeps the field focused while an option is being clicked.
   *
   * `mousedown` blurs the field before the click lands, and the blur closes
   * the list - so without this the option is gone by the time it is clicked.
   */
  protected keepFocus(event: MouseEvent): void {
    event.preventDefault();
  }


  /**
   * Drops the selection and hands focus back to the field, which is where the
   * next family is chosen - the button the visitor pressed does nothing more.
   */
  protected clear(): void {
    this.font.set(null);
    this.open.set(false);
    this.field().nativeElement.focus();
  }


  protected retry(): void {
    this.retrying.set(true);
    this.catalog.reload();
  }


  #move(delta: number): void {
    const count = this.options().length;

    if (count === 0) return;

    if (!this.open()) {
      this.open.set(true);
      return;
    }

    this.activeIndex.update(index => (index + delta + count) % count);
  }

}
