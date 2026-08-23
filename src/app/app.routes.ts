import {Routes} from "@angular/router";
import {Converter} from "@converter/components/converter/converter";
import {ColorPalette} from "@palettes/components/color-palette/color-palette";
import {Contrast} from "@contrast/components/contrast/contrast";
import {paletteGuard} from "./routes/palette-route.guard";
import {contrastGuard} from "./routes/contrast-route.guard";
import {NotFound} from "@common/components/not-found/not-found";


export const routes: Routes = [
  {
    path: "",
    redirectTo: "/convert",
    pathMatch: "full"
  },

  {
    path: "convert",
    component: Converter,
    pathMatch: "full",
    title: "ColorTools – Convert colors & Generate color palettes"
  },

  {
    path: "palettes",
    canActivate: [paletteGuard],
    children: [
      {
        path: ":paletteId",
        component: ColorPalette,
        title: "ColorTools – Palettes",
      }
    ]
  },

  {
    path: "contrast",
    canActivate: [contrastGuard],
    children: [
      {
        path: ":contrastId",
        component: Contrast,
        title: "ColorTools – Contrast Checker",
      }
    ]
  },

  {
    path: "**",
    component: NotFound,
    title: "ColorTools – Page not found"
  }
];
