import {Component, computed, inject, signal} from "@angular/core";
import {RouterLink} from "@angular/router";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import {fromOklch} from "@common/helpers/color-from-oklch.helper";
import {maxChroma} from "@common/helpers/oklch.helper";
import {createTints} from "@common/helpers/tints-and-shades.helper";
import {OKLCH} from "@palettes/models/oklch.model";


/** Steps in the tint strip below the swatch. */
const TINT_COUNT = 8;

/**
 * Coordinates whose chroma sRGB cannot hold at that lightness and hue, so
 * every one of them has a story to tell: what was asked for, and what the
 * gamut gives back instead.
 */
const OUT_OF_GAMUT: readonly OKLCH[] = [
  {l: 0.62, c: 0.34, h: 268},
  {l: 0.55, c: 0.36, h: 24},
  {l: 0.70, c: 0.32, h: 148},
  {l: 0.48, c: 0.33, h: 320},
  {l: 0.75, c: 0.30, h: 92}
];


/** Formats OKLch coordinates the way CSS spells them. */
function oklchText(oklch: OKLCH, chromacity: number): string {
  return `oklch(${(oklch.l * 100).toFixed(0)}% ${chromacity.toFixed(3)} ${oklch.h})`;
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
 * `REQUESTED` and `NEAREST VALID` are stand-ins showing a color instead of
 * the requested path. The path half is cheap, but the pair only reads as a
 * pair once `NEAREST VALID` names the nearest existing route - and that needs
 * the final route set to match against.
 */
@Component({
  selector: "ct-not-found",
  imports: [RouterLink],
  templateUrl: "./not-found.html"
})
export class NotFound {

  readonly #announcer = inject(LiveAnnouncer);

  readonly #seed = signal(0);

  readonly #variant = computed(
    () => OUT_OF_GAMUT[this.#seed() % OUT_OF_GAMUT.length]
  );

  /** The chroma sRGB actually holds at the variant's lightness and hue. */
  readonly #clippedChroma = computed(() => {
    const variant = this.#variant();

    return Math.min(variant.c, maxChroma(variant.l, variant.h));
  });

  readonly #color = computed(() => fromOklch(this.#variant()));

  protected readonly colorHex = computed(
    () => this.#color().hex().toUpperCase()
  );

  /**
   * The ramp under the swatch. The base color sits above it and pure white
   * would be invisible on `bg`, so both ends of the scale are dropped.
   */
  protected readonly tints = computed(
    () => createTints(this.#color(), true, true, TINT_COUNT + 2)
      .slice(1, TINT_COUNT + 1)
      .map(tint => tint.hex().toUpperCase())
  );

  protected readonly requested = computed(
    () => oklchText(this.#variant(), this.#variant().c)
  );

  protected readonly nearestValid = computed(
    () => `${oklchText(this.#variant(), this.#clippedChroma())} · ${this.colorHex()}`
  );

  protected readonly caption = computed(
    () => `Requested chroma ${this.#variant().c.toFixed(3)} clipped to `
      + `${this.#clippedChroma().toFixed(3)} in sRGB.`
  );


  /**
   * Rolls the next out-of-gamut color. Nothing moves focus, so the outcome
   * is announced rather than left to be discovered.
   */
  protected mixAnother(): void {
    this.#seed.update(seed => seed + 1);

    void this.#announcer.announce(`Mixed ${this.nearestValid()}`);
  }

}
