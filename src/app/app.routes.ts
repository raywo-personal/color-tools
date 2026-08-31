import {Routes} from "@angular/router";
import {Studio} from "@studio/components/studio/studio";
import {ContrastType} from "@contrast-type/components/contrast-type/contrast-type";
import {NotFound} from "@common/components/not-found/not-found";


export const routes: Routes = [
  {
    path: "",
    component: Studio,
    pathMatch: "full",
    title: "ColorTools – Studio"
  },

  {
    path: "contrast",
    component: ContrastType,
    pathMatch: "full",
    title: "ColorTools – Contrast & Type"
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
