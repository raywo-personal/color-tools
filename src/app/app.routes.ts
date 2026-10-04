import {Routes} from "@angular/router";
import {Studio} from "@studio/components/studio/studio";
import {ContrastType} from "@contrast-type/components/contrast-type/contrast-type";
import {NotFound} from "@common/components/not-found/not-found";
import {studioMatcher} from "./routes/studio-route.matcher";
import {paletteGuard} from "./routes/palette-route.guard";
import {contrastGuard} from "./routes/contrast-route.guard";
import {v1ContrastMatcher, v1ContrastRedirect, v1PaletteMatcher, v1PaletteRedirect} from "./routes/v1-link.redirect";


export const routes: Routes = [
  {
    // `/` and `/<palette segment>`. The guard sends a bare `/` on to the
    // address of the state the visitor already has.
    matcher: studioMatcher,
    component: Studio,
    canActivate: [paletteGuard],
    title: "ColorTools – Studio",
    // Which address the navigation effects keep in step with the state. Not
    // `view`: input binding lets data win over params, and an input named
    // after the `:view` param below would receive "contrast" instead of the
    // address's view segment.
    data: {addressOf: "studio"}
  },

  {
    // A bare `/contrast` is what the tabs link to; the guard sends it on to
    // the address below.
    path: "contrast",
    component: ContrastType,
    canActivate: [contrastGuard],
    pathMatch: "full",
    title: "ColorTools – Contrast & Type",
    data: {addressOf: "contrast"}
  },

  {
    path: "contrast/:palette/:view/:faces",
    component: ContrastType,
    canActivate: [contrastGuard],
    pathMatch: "full",
    title: "ColorTools – Contrast & Type",
    data: {addressOf: "contrast"}
  },

  // v1 links that carry an id. They redirect and never render, so they need
  // no title. The two v1 paths without an id - `/convert` and a bare
  // `/palettes` - are answered with a 301 in `public/_redirects` before the
  // app loads.
  {
    matcher: v1PaletteMatcher,
    redirectTo: v1PaletteRedirect
  },

  {
    matcher: v1ContrastMatcher,
    redirectTo: v1ContrastRedirect
  },

  {
    // The only route that opts out. `NotFound` carries a header of its own -
    // the wordmark links back into the studio - so a visitor who lands here
    // still has a way off the page without the app header's tabs.
    path: "**",
    component: NotFound,
    title: "ColorTools – Page not found",
    data: {appHeader: false}
  }
];
