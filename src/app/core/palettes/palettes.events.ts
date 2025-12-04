import {eventGroup} from "@ngrx/signals/events";
import {type} from "@ngrx/signals";
import {Palette} from "@palettes/models/palette.model";
import {PaletteStyle} from "@palettes/models/palette-style.model";
import {PaletteColor} from "@palettes/models/palette-color.model";


export const palettesEvents = eventGroup({
  source: "Palettes",
  events: {
    newRandomPalette: type<void>(),
    newPalette: type<void>(),
    restorePalette: type<string>(),
    updatePaletteColor: type<PaletteColor>(),
    paletteChanged: type<Palette>(),
    useRandomChanged: type<boolean>(),
    styleChanged: type<PaletteStyle>(),
    seedHueChanged: type<number>()
  }
})
