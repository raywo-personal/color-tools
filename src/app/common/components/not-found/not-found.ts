import {Component, computed, inject, signal} from "@angular/core";
import {ActivatedRoute, RouterLink} from "@angular/router";
import {toSignal} from "@angular/core/rxjs-interop";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import chroma from "chroma-js";
import {PALETTE_SLOTS} from "@palettes/models/palette.model";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {generatePalette} from "@palettes/helper/palette.helper";


/** Filled slots plus the empty ones that stand in for the missing page. */
const SWATCH_COUNT = 8;

const MISSING_SLOT_COUNT = SWATCH_COUNT - PALETTE_SLOTS.length;

/**
 * The v1 accent. It is a seed now rather than a theme value: v2 has no
 * themed accent color, and reading one off the root element would either
 * find nothing or tie the page to a token the design system does not have.
 */
const ACCENT = "hsl(38.66, 100%, 49.61%)";


/**
 * A muted analogous palette grown from the accent. Rolled per call - the
 * generator jitters every member the pinned color does not fix - so mixing
 * another one produces a palette rather than the same one again.
 */
function accentPalette(): string[] {
  const accent = paletteColorFrom(chroma(ACCENT), "color0");
  const palette = generatePalette("muted-analog-split", {color0: accent});

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
 * The picture beside the text is a ColorTools palette that stops short: five
 * colors, then the slots it never reached. A visitor who mistyped a path
 * needs no color theory to read that, and it says what actually happened -
 * something in a sequence is missing, not something impossible was asked for.
 */
@Component({
  selector: "ct-not-found",
  imports: [RouterLink],
  templateUrl: "./not-found.html"
})
export class NotFound {

  readonly #announcer = inject(LiveAnnouncer);
  readonly #route = inject(ActivatedRoute);

  /**
   * Two unknown paths share this route config, so the router reuses the
   * component instance - a snapshot read would keep naming the first path.
   */
  readonly #segments = toSignal(this.#route.url, {initialValue: this.#route.snapshot.url});

  readonly #swatches = signal(accentPalette());

  protected readonly requestedPath = computed(
    () => "/" + this.#segments().map(segment => segment.path).join("/")
  );

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
   * The chips are decoration and the hex labels beside them are read out on
   * their own, so the list says once what the two kinds of row mean.
   */
  protected readonly swatchesLabel =
    `A ColorTools palette of ${PALETTE_SLOTS.length} colors, `
    + `with ${MISSING_SLOT_COUNT} slots left unmixed`;


  /**
   * Rolls the palette again. Nothing moves focus, so the outcome is
   * announced rather than left to be discovered.
   */
  protected mixAnother(): void {
    this.#swatches.set(accentPalette());

    void this.#announcer.announce(`New palette: ${this.#swatches().join(", ")}`);
  }

}
