import {inject} from "@angular/core";
import {RedirectFunction, Router, UrlMatcher, UrlMatchResult, UrlSegment, UrlTree} from "@angular/router";
import {AppStateStore} from "@core/app-state.store";
import {isWellFormedId} from "@engine/helpers/validate-string-id.helper";
import {randomSeed} from "@engine/helpers/random.helper";
import {isRestorablePaletteId, PALETTE_ID_BASE62_LENGTH, paletteFromId} from "@engine/palette/palette-id.helper";
import {paletteSegmentFrom} from "@engine/palette/palette-segment.helper";
import {CONTRAST_ID_LENGTH, contrastColorsFromId, isRestorableContrastId} from "@engine/contrast/contrast-id.helper";
import {rolledPalette} from "./palette-route.guard";
import {contrastTypeUrlTree} from "./contrast-route.guard";


/** The route param both v1 matchers put the id into. */
const V1_ID_PARAM = "id";


/**
 * Matches a v1 palette link, `/palettes/<palette id>`.
 *
 * By shape, like `studioMatcher`: an id of the right length and alphabet
 * that does not decode is a link gone bad and lands on a fresh palette, while
 * `/palettes/extra` was never a link and stays the not-found page's.
 */
export const v1PaletteMatcher: UrlMatcher = (segments: UrlSegment[]): UrlMatchResult | null =>
  v1Match(segments, "palettes", PALETTE_ID_BASE62_LENGTH);


/**
 * Matches a v1 contrast link, `/contrast/<pair id>`. Two segments and nine
 * characters, so it never takes the Contrast & Type address, which has four.
 */
export const v1ContrastMatcher: UrlMatcher = (segments: UrlSegment[]): UrlMatchResult | null =>
  v1Match(segments, "contrast", CONTRAST_ID_LENGTH);


/**
 * Sends a v1 palette link to the Studio's address for that palette.
 *
 * The redirect only writes the address; `paletteGuard` restores it, as it
 * would any shared link. v1 ids decode as they are - the style index kept its
 * spelling - and get a fresh seed, because v1 had none. An id that does not
 * decode gets a freshly rolled palette, as an unreadable Studio address does.
 */
export const v1PaletteRedirect: RedirectFunction = ({params, fragment}): UrlTree => {
  const id: unknown = params[V1_ID_PARAM];
  const {currentPalette, paletteSeed} = typeof id === "string" && isRestorablePaletteId(id)
    ? {currentPalette: paletteFromId(id), paletteSeed: randomSeed()}
    : rolledPalette(inject(AppStateStore));

  return inject(Router).createUrlTree(
    ["/", paletteSegmentFrom(currentPalette, paletteSeed)],
    {fragment: fragment ?? undefined}
  );
};


/**
 * Sends a v1 contrast link to the Contrast & Type address for that pair.
 *
 * The visitor's palette and type stay; v1 placed nothing by hand, so the
 * placements are cleared rather than laid over a pair they were not made
 * for. `contrastGuard` restores the address. An id that does not decode gets
 * a freshly rolled palette and keeps the rest, as an unreadable Contrast &
 * Type address does.
 */
export const v1ContrastRedirect: RedirectFunction = ({params, fragment}): UrlTree => {
  const id: unknown = params[V1_ID_PARAM];
  const changes = typeof id === "string" && isRestorableContrastId(id)
    ? {contrastColors: contrastColorsFromId(id), placements: {}}
    : rolledPalette(inject(AppStateStore));

  return contrastTypeUrlTree(changes, fragment);
};


function v1Match(segments: UrlSegment[], path: string, idLength: number): UrlMatchResult | null {
  if (segments.length !== 2) return null;

  const [head, id] = segments;

  if (head.path !== path || !isWellFormedId(id.path, idLength)) return null;

  return {consumed: segments, posParams: {[V1_ID_PARAM]: id}};
}
