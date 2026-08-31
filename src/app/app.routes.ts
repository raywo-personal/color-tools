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
    // No `data: {appHeader: false}` here: this page has no header of its own,
    // and its links point at the removed v1 routes, so without the app header
    // a visitor on an old bookmark has no way off it. The opt-out belongs
    // here once the page carries its own header.
    path: "**",
    component: NotFound,
    title: "ColorTools – Page not found"
  }
];
