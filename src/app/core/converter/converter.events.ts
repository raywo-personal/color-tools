import {eventGroup} from "@ngrx/signals/events";
import {type} from "@ngrx/signals";
import {Color} from "chroma-js";
import {ColorSpace} from "@common/models/color-space.model";


export const converterEvents = eventGroup({
  source: "Converter",
  events: {
    newRandomColorWithNav: type<void>(),
    colorChanged: type<Color>(),

    /**
     * A color the visitor is still setting - every frame of a slider drag.
     *
     * It carries the same state change as `colorChanged` and shares its
     * reducer, and it is deliberately **not** in `anyPersistableEvents$`: a
     * drag fires it per pointer move, and each one would write five
     * localStorage keys. The control that raised it commits with
     * `colorChanged` when the gesture ends, so the last value is the one that
     * is stored.
     */
    colorAdjusted: type<Color>(),
    useAsBackgroundChanged: type<boolean>(),
    correctLightnessChanged: type<boolean>(),
    useBezierChanged: type<boolean>(),
    displayColorSpaceChanged: type<ColorSpace>()
  }
});
