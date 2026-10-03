import {UrlMatcher, UrlMatchResult, UrlSegment} from "@angular/router";
import {isStudioPath} from "@studio/models/studio-address.model";
import {PALETTE_SEGMENT_PARAM} from "./palette-route.guard";


/**
 * Matches the Studio's paths: `/` and `/<palette segment>`.
 *
 * A matcher and not `path: ":palette"`: a bare parameter takes every
 * one-segment path, so a mistyped `/contrsat` would open the Studio instead
 * of the not-found page. The matcher answers whole paths only, which is what
 * `pathMatch: "full"` does for the other feature routes.
 */
export const studioMatcher: UrlMatcher = (segments: UrlSegment[]): UrlMatchResult | null => {
  if (!isStudioPath(segments.map(segment => segment.path))) return null;

  const [palette] = segments;

  return {
    consumed: segments,
    posParams: palette ? {[PALETTE_SEGMENT_PARAM]: palette} : {}
  };
};
