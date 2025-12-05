import {eventGroup} from "@ngrx/signals/events";
import {type} from "@ngrx/signals";
import {Palette} from "@palettes/models/palette.model";
import {PaletteStyle} from "@palettes/models/palette-style.model";
import {PaletteColor} from "@palettes/models/palette-color.model";


export const palettesEvents = eventGroup({
  source: "Palettes",
  events: {
    /**
     * Fired when a completely new palette is created.
     * Mainly when no restorable ID is provided.
     */
    newRandomPalette: type<void>(),
    /**
     * Fired when a new palette should be created preserving the pinned colors.
     */
    newPalette: type<void>(),
    /**
     * Fired when a palette should be restored from a n ID.
     */
    restorePalette: type<string>(),
    /**
     * Fired when a palette color should be updated.
     */
    updatePaletteColor: type<PaletteColor>(),
    paletteChanged: type<Palette>(),
    useRandomChanged: type<boolean>(),
    styleChanged: type<PaletteStyle>(),
    seedHueChanged: type<number>()
  }
})
