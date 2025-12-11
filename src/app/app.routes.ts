import {Routes} from "@angular/router";
import {Converter} from "@converter/components/converter/converter";
import {ColorPalette} from "@palettes/components/color-palette/color-palette";
import {EmptyPalette} from "@palettes/components/empty-palette/empty-palette";
import {Contrast} from "@contrast/components/contrast/contrast";
import {EmptyContrast} from "@contrast/components/empty-contrast/empty-contrast";


export const routes: Routes = [
  {
    path: "",
    redirectTo: "/convert",
    pathMatch: "full"
  },

  {
    path: "convert",
    component: Converter,
    pathMatch: "full"
  },

  {
    path: "palettes",
    component: EmptyPalette
  },
  {
    path: "palettes/:paletteId",
    component: ColorPalette,
    title: "ColorTools – Palettes",
  },

  {
    path: "contrast",
    component: EmptyContrast
  },
  {
    path: "contrast/:contrastId",
    component: Contrast,
    title: "ColorTools – Contrast Checker"
  }
];
