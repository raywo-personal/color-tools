import {eventGroup} from "@ngrx/signals/events";
import {type} from "@ngrx/signals";
import {Color} from "chroma-js";
import {ContrastColors} from "@contrast/models/contrast-colors.model";


export const contrastEvents = eventGroup({
  source: "Contrast",
  events: {
    textColorChanged: type<Color>(),
    backgroundColorChanged: type<Color>(),
    contrastColorsChangedWithoutNav: type<ContrastColors>(),
    switchColors: type<void>(),
    newRandomColorsWithNav: type<void>(),
    restoreContrastColors: type<string>()
  }
});
