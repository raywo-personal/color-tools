import {Component, computed, inject, signal} from "@angular/core";
import {Router, RouterLink} from "@angular/router";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import chroma, {Color} from "chroma-js";
import {PALETTE_SLOTS} from "@engine/palette/palette.model";
import {PaletteStyle} from "@engine/palette/palette-style.model";
import {generatePalette, generatePaletteFrom} from "@engine/palette/palette.helper";
import {paletteSegmentFrom, PaletteWithSeed} from "@engine/palette/palette-segment.helper";
import {randomSeed} from "@engine/helpers/random.helper";
import {colorName} from "@engine/color/color-name.helper";


/** Filled slots plus the empty ones that stand in for the missing page. */
const SWATCH_COUNT = 8;

const MISSING_SLOT_COUNT = SWATCH_COUNT - PALETTE_SLOTS.length;

const STYLE: PaletteStyle = "muted-analog-split";

/**
 * The v1 accent, opening the page on a known color rather than a rolled one.
 * It is a plain constant now: v2 has no themed accent, so there is no token to
 * read it from and nothing it could drift out of step with.
 */
const ACCENT = chroma("hsl(38.66, 100%, 49.61%)");


/**
 * A mixed slot. The hex is what the page prints; the name is what a screen
 * reader is given, because a hex code is read out one character at a time and
 * says nothing about the color.
 */
interface Swatch {
  readonly hex: string;
  readonly name: string;
}


/**
 * A muted analogous palette and the seed it was rolled with. Given a base
 * color it varies the four members around it; given none it rolls the base
 * as well, which is what makes a second palette look like a different
 * palette rather than a reshuffle of the same hue.
 *
 * The members come from `generatePaletteFrom()` under a seed of their own,
 * never from `generatePalette()` alone: the Studio rebuilds a palette under
 * its seed on every move of the base color, so a palette drawn without one
 * opens through the link as shown and re-rolls on the first drag. The base
 * is the generator's own roll, which keeps it in the muted range.
 *
 * The base is taken as the id carries it, in hex: the Studio rebuilds on the
 * restored base, and an unrounded one here would derive members a step off
 * the ones it derives there.
 */
function mutedPalette(base?: Color): PaletteWithSeed {
  const seed = randomSeed();
  const color0 = chroma((base ?? generatePalette(STYLE).color0.color).hex());

  return {palette: generatePaletteFrom(color0, STYLE, seed), seed};
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
 * something in a sequence is missing. The picture is a link as well: it opens
 * the five colors in the Studio, so a palette the visitor likes is not lost
 * with the page.
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

  readonly #mixed = signal(mutedPalette(ACCENT));

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

  protected readonly swatches = computed<Swatch[]>(() => {
    const {palette} = this.#mixed();

    return PALETTE_SLOTS.map(slot => ({
      hex: palette[slot].color.hex().toUpperCase(),
      name: colorName(palette[slot].color)
    }));
  });

  /** The Studio's address for the palette on show, seed included. */
  protected readonly studioLink = computed(() => {
    const {palette, seed} = this.#mixed();

    return ["/", paletteSegmentFrom(palette, seed)];
  });

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
    this.#mixed.set(mutedPalette());

    const names = this.swatches().map(swatch => swatch.name).join(", ");

    void this.#announcer.announce(`New palette: ${names}`);
  }

}
