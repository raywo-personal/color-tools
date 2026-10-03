import {Routes} from "@angular/router";
import {Studio} from "@studio/components/studio/studio";
import {ContrastType} from "@contrast-type/components/contrast-type/contrast-type";
import {NotFound} from "@common/components/not-found/not-found";
import {studioMatcher} from "./routes/studio-route.matcher";
import {paletteGuard} from "./routes/palette-route.guard";
import {contrastGuard} from "./routes/contrast-route.guard";


export const routes: Routes = [
  {
    // `/` and `/<palette segment>`. The guard sends a bare `/` on to the
    // address of the state the visitor already has.
    matcher: studioMatcher,
    component: Studio,
    canActivate: [paletteGuard],
    title: "ColorTools – Studio",
    // Which address the navigation effects keep in step with the state.
    data: {view: "studio"}
  },

  {
    // A bare `/contrast` is what the tabs link to; the guard sends it on to
    // the address below.
    path: "contrast",
    component: ContrastType,
    canActivate: [contrastGuard],
    pathMatch: "full",
    title: "ColorTools – Contrast & Type",
    data: {view: "contrast"}
  },

  {
    path: "contrast/:palette/:view/:faces",
    component: ContrastType,
    canActivate: [contrastGuard],
    pathMatch: "full",
    title: "ColorTools – Contrast & Type",
    data: {view: "contrast"}
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
