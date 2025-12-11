import {injectDispatch} from "@ngrx/signals/events";
import {CanActivateFn} from "@angular/router";
import {palettesEvents} from "@core/palettes/palettes.events";


export const paletteGuard: CanActivateFn = (route) => {
  const dispatch = injectDispatch(palettesEvents);

  const paletteId =
    route.params["paletteId"] ?? route.firstChild?.params["paletteId"];

  if (!paletteId) {
    dispatch.newRandomPalette();
    // The effect will handle navigation
    return false;
  }
  return true;
};
