import {eventGroup} from "@ngrx/signals/events";
import {type} from "@ngrx/signals";
import {Color} from "chroma-js";
import {ContrastColors} from "@engine/contrast/contrast-colors.model";
import {ChipSource} from "@contrast-type/models/chip-source.model";


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
    verdictToggled: type<string>(),
    /**
     * A chip was put on one element of the sample page: the element's
     * `SAMPLE_ELEMENTS` key and the chip it takes its colour from.
     *
     * The source rather than the colour, so repainting the palette or typing
     * a new pair keeps the placement and hands the element the new colour of
     * the same chip - `ElementPlacements` says why.
     *
     * Not persisted: the placements are part of the result, and carrying
     * them across a reload is #68's.
     */
    colorPlaced: type<{elementKey: string; source: ChipSource}>(),
    /**
     * A drag of a chip started, and that chip is now in hand.
     *
     * A drag raises this and nothing else does - `AppState.carriedChip` says
     * why a press must not. The chooser on an element's mark places straight
     * away and never puts anything in hand.
     */
    chipPickedUp: type<ChipSource>(),
    /**
     * Nothing is in hand any more: a drag released where there was no
     * element, a pan or a zoom that took the pointer away, or Escape. A
     * placement puts the chip down by itself, so this is the gesture that
     * ended without one.
     */
    chipPutDown: type<void>(),
    /** One element goes back to the colour the page gives it by default. */
    placementReset: type<string>(),
    /** `RESET PAGE`: every element goes back to the default assignment. */
    placementsReset: type<void>()
  }
});
