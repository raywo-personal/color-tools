import {Component, computed, DOCUMENT, inject} from "@angular/core";
import {ActivatedRoute, RouterLink} from "@angular/router";
import {toSignal} from "@angular/core/rxjs-interop";
import chroma, {Color} from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {contrastIdFromColors} from "@contrast/helper/contrast-id.helper";
import {PALETTE_SLOTS} from "@palettes/models/palette.model";
import {paletteColorFrom} from "@palettes/models/palette-color.model";
import {generatePalette} from "@palettes/helper/palette.helper";


/** Filled slots plus the empty ones that stand in for the missing page. */
const SWATCH_COUNT = 8;

/**
 * Mirrors `$primary` in `src/app/styles/_variables.scss` and is only reached
 * when `--bs-primary` cannot be read - outside a browser, or before the
 * stylesheet has landed.
 */
const ACCENT_FALLBACK = "hsl(38.66, 100%, 49.61%)";


/**
 * Renders the wildcard route.
 *
 * The SPA rewrite in `public/_redirects` answers every path with `index.html`
 * and HTTP 200, so an unknown path cannot produce a real 404 status. This
 * component makes the miss visible to the visitor instead of leaving the page
 * blank, and links back to the three feature routes - keeping the palette and
 * contrast colors the visitor already has, exactly as the top bar does.
 */
@Component({
  selector: "ct-not-found",
  imports: [RouterLink],
  templateUrl: "./not-found.html",
  styleUrl: "./not-found.scss"
})
export class NotFound {

  readonly #document = inject(DOCUMENT);
  readonly #route = inject(ActivatedRoute);
  readonly #stateStore = inject(AppStateStore);

  /**
   * Two unknown paths share this route config, so the router reuses the
   * component instance - a snapshot read would keep naming the first path.
   */
  readonly #segments = toSignal(this.#route.url, {initialValue: this.#route.snapshot.url});

  protected readonly requestedPath = computed(
    () => "/" + this.#segments().map(segment => segment.path).join("/")
  );

  /**
   * A muted analogous palette grown from the accent color. Generated once per
   * visit rather than read from the store, so the page keeps its designed look
   * instead of inheriting whatever palette the visitor happens to carry.
   */
  protected readonly swatches = this.#accentPalette();

  /**
   * The empty slots trailing the palette. A ColorTools palette holds exactly
   * `PALETTE_SLOTS.length` colors, so the remainder is what the page is
   * missing - the visual echo of the route that does not exist.
   */
  protected readonly missingSlots = Array.from(
    {length: SWATCH_COUNT - PALETTE_SLOTS.length},
    (_, index) => index
  );

  protected readonly paletteId = computed(() => this.#stateStore.currentPalette().id);

  protected readonly contrastId = computed(() => {
    return contrastIdFromColors(this.#stateStore.contrastColors());
  });


  #accentPalette(): string[] {
    const accent = paletteColorFrom(this.#accentColor(), "color0");
    const palette = generatePalette("muted-analog-split", {color0: accent});

    return PALETTE_SLOTS.map(slot => palette[slot].color.hex().toUpperCase());
  }


  /** Reads the accent straight off the theme so it cannot drift from `$primary`. */
  #accentColor(): Color {
    const declared = getComputedStyle(this.#document.documentElement)
      .getPropertyValue("--bs-primary")
      .trim();

    return chroma(declared || ACCENT_FALLBACK);
  }

}
