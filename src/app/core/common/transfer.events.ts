import {eventGroup} from "@ngrx/signals/events";
import {ContrastColor} from "@contrast/models/contrast-color.model";
import {type} from "@ngrx/signals";
import {Color} from "chroma-js";


export const transferEvents = eventGroup({
  source: "Transfer",
  events: {
    useColorAsPaletteStarter: type<Color>(),
    sendColorToContrast: type<ContrastColor>()
  }
});
