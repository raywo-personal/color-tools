import {eventGroup} from "@ngrx/signals/events";
import {type} from "@ngrx/signals";
import {Color} from "chroma-js";
import {ContrastColors} from "@engine/contrast/contrast-colors.model";


export const contrastEvents = eventGroup({
  source: "Contrast",
  events: {
    textColorChanged: type<Color>(),
    backgroundColorChanged: type<Color>(),
    contrastColorsChangedWithoutNav: type<ContrastColors>(),
    switchColors: type<void>(),
    newRandomColorsWithNav: type<void>(),
    restoreContrastColors: type<string>(),
    /**
     * A mark beside the preview was pressed: the key of the element whose
     * verdict opens, or the one that closes because it was already open.
     *
     * Not persisted: an opened verdict is a look at the page, not part of the
     * result the link and the reload carry.
     */
    verdictToggled: type<string>()
  }
});
