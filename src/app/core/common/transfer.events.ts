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
    generatePaletteFromContrast: type<ContrastColors>(),
    /**
     * The other direction of `generatePaletteFromContrast`: the pair is taken
     * out of the current palette.
     *
     * No payload, like `switchColors` - the reducer reads the palette off the
     * state. A payload would let a caller hand in a palette the rest of the
     * app is not showing.
     */
    sendPaletteToContrast: type<void>()
  }
});
