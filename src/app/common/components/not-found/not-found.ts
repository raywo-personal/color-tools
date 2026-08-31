import {Component, computed, inject, signal} from "@angular/core";
import {Router, RouterLink} from "@angular/router";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import chroma from "chroma-js";
import {PALETTE_SLOTS} from "@palettes/models/palette.model";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {generatePalette} from "@palettes/helper/palette.helper";


/** Filled slots plus the empty ones that stand in for the missing page. */
const SWATCH_COUNT = 8;

const MISSING_SLOT_COUNT = SWATCH_COUNT - PALETTE_SLOTS.length;

/**
 * The v1 accent, opening the page on a known color rather than a rolled one.
 * It is a plain seed now: v2 has no themed accent, so there is no token to
 * read it from and nothing it could drift out of step with.
 */
const ACCENT = "hsl(38.66, 100%, 49.61%)";


/**
 * A muted analogous palette. Given a base color it varies the four members
 * around it; given none it rolls the base as well, which is what makes a
 * second palette look like a different palette rather than a reshuffle of
 * the same hue.
 */
function mutedPalette(base?: string): string[] {
  const color0 = base ? paletteColorFrom(chroma(base), "color0") : undefined;
  const palette = generatePalette("muted-analog-split", color0 ? {color0} : {});

  return PALETTE_SLOTS.map(slot => palette[slot].color.hex().toUpperCase());
}


/**
 * Renders the wildcard route.
 *
 * The SPA rewrite in `public/_redirects` answers every path with `index.html`
 * and HTTP 200, so an unknown path cannot produce a real 404 status. This
 * component makes the miss visible to the visitor instead of leaving the
 * viewport blank.
 *
 * It carries a header of its own - the wordmark and the `ERROR 404` marker -
 * which is what lets the route opt out of the app header. The wordmark is the
 * way off the page, so it stays a link even though the page has no tabs.
 *
 * The picture below the text is a ColorTools palette that stops short: five
 * colors, then the slots it never reached. A visitor who mistyped a path
 * needs no color theory to read that, and it says what actually happened -
 * something in a sequence is missing.
 *
 * `OUT OF GAMUT` therefore reads figuratively: the requested page lies
 * outside the gamut of the pages that exist. It is not a claim about sRGB,
 * and nothing on the page computes a gamut boundary.
 */
@Component({
  selector: "ct-not-found",
  imports: [RouterLink],
  templateUrl: "./not-found.html"
})
export class NotFound {

  readonly #announcer = inject(LiveAnnouncer);
  readonly #router = inject(Router);

  readonly #swatches = signal(mutedPalette(ACCENT));

  /**
   * `Router.url`, not `ActivatedRoute.url`: the segments carry the path alone,
   * so a visitor who followed `/palletes?color=ff0000` would be told they
   * asked for `/palletes`, and a percent-encoded segment would come back
   * decoded. The address is the page's one factual claim, and the person
   * reading it is chasing a broken link.
   *
   * Two unknown paths share this route config, so the router reuses the
   * component instance. Reading `lastSuccessfulNavigation` is what re-reads
   * the url for the second path - `Router.url` is a plain getter.
   */
  protected readonly requestedPath = computed(() => {
    this.#router.lastSuccessfulNavigation();

    return this.#router.url;
  });

  protected readonly swatches = this.#swatches.asReadonly();

  /**
   * The empty slots trailing the palette. A ColorTools palette holds exactly
   * `PALETTE_SLOTS.length` colors, so the remainder is what the page is
   * missing - the visual echo of the route that does not exist.
   */
  protected readonly missingSlots = Array.from(
    {length: MISSING_SLOT_COUNT},
    (_, index) => index
  );

  /**
   * The chips are decoration and their labels are read out on their own, so
   * the list says once what the two kinds of entry mean.
   */
  protected readonly swatchesLabel =
    `A ColorTools palette of ${PALETTE_SLOTS.length} colors, `
    + `with ${MISSING_SLOT_COUNT} slots left unmixed`;


  /**
   * Rolls a whole new palette, base color included. Nothing moves focus, so
   * the outcome is announced rather than left to be discovered.
   */
  protected mixAnother(): void {
    this.#swatches.set(mutedPalette());

    void this.#announcer.announce(`New palette: ${this.#swatches().join(", ")}`);
  }

}
