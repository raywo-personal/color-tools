import {eventGroup} from "@ngrx/signals/events";
import {type} from "@ngrx/signals";
import {Color} from "chroma-js";


export const contrastEvents = eventGroup({
  source: "Contrast",
  events: {
    textColorChanged: type<Color>(),
    backgroundColorChanged: type<Color>(),
    newRandomColors: type<void>()
  }
})
