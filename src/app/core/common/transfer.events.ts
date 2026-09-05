import {eventGroup} from "@ngrx/signals/events";
import {ContrastColor} from "@engine/contrast/contrast-color.model";
import {type} from "@ngrx/signals";
import {Color} from "chroma-js";
import {ContrastColors} from "@engine/contrast/contrast-colors.model";


export const transferEvents = eventGroup({
  source: "Transfer",
  events: {
    useColorAsPaletteStarter: type<Color>(),
    sendColorToContrast: type<ContrastColor>(),
    generatePaletteFromContrast: type<ContrastColors>()
  }
});
