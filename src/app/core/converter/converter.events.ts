import {eventGroup} from "@ngrx/signals/events";
import {type} from "@ngrx/signals";
import {Color} from "chroma-js";
import {ColorSpace} from "@common/models/color-space.model";


export const converterEvents = eventGroup({
  source: "Converter",
  events: {
    newRandomColor: type<void>(),
    colorChanged: type<Color>(),
    useAsBackgroundChanged: type<boolean>(),
    correctLightnessChanged: type<boolean>(),
    useBezierChanged: type<boolean>(),
    displayColorSpaceChanged: type<ColorSpace>()
  }
});
