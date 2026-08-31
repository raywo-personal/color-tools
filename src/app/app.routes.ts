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
    // The not-found page carries a header of its own, so the app header would
    // be the second one on the screen.
    path: "**",
    component: NotFound,
    title: "ColorTools – Page not found",
    data: {appHeader: false}
  }
];
