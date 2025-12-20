import {eventGroup} from "@ngrx/signals/events";
import {ContrastColor} from "@contrast/models/contrast-color.model";
import {type} from "@ngrx/signals";
import {Color} from "chroma-js";
import {ContrastColors} from "@contrast/models/contrast-colors.model";


export const transferEvents = eventGroup({
  source: "Transfer",
  events: {
    useColorAsPaletteStarter: type<Color>(),
    sendColorToContrast: type<ContrastColor>(),
    startPaletteFromContrast: type<ContrastColors>()
  }
});
