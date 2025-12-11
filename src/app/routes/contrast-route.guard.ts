import {contrastEvents} from "@core/contrast/contrast.events";
import {injectDispatch} from "@ngrx/signals/events";
import {CanActivateFn} from "@angular/router";


export const contrastGuard: CanActivateFn = (route) => {
  const dispatch = injectDispatch(contrastEvents);

  const contrastId =
    route.params["contrastId"] ?? route.firstChild?.params["contrastId"];

  if (!contrastId) {
    dispatch.newRandomColors();
    // The effect will handle navigation
    return false;
  }
  return true;
};
