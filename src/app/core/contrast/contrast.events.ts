import {eventGroup} from "@ngrx/signals/events";
import {type} from "@ngrx/signals";
import {Color} from "chroma-js";
import {ContrastColors} from "@engine/contrast/contrast-colors.model";
import {ChipSource} from "@contrast-type/models/chip-source.model";
import {SamplePlacement} from "@contrast-type/models/sample-page.model";


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
     * A chip was put on one side of one element of the sample page: the
     * element's `SAMPLE_ELEMENTS` key, which of its two colours the chip
     * takes, and the chip itself.
     *
     * The source rather than the colour, so repainting the palette or typing
     * a new pair keeps the placement and hands the element the new colour of
     * the same chip - `ElementPlacements` says why.
     *
     * **The side travels with the event.** A drop reads it off the half of
     * the element the chip was released on and the chooser off its own
     * toggle, so neither the reducer nor the announcement has to ask what a
     * placement was for.
     *
     * Not persisted: the placements are part of the result, and carrying
     * them across a reload is #68's.
     */
    colorPlaced: type<{elementKey: string; side: SamplePlacement; source: ChipSource}>(),
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
    /**
     * One side of one element goes back to the colour the page gives it by
     * default. The other side keeps whatever it was given: they are two
     * placements and the ledger resets them a row at a time.
     */
    placementReset: type<{elementKey: string; side: SamplePlacement}>(),
    /** `RESET PAGE`: every element goes back to the default assignment. */
    placementsReset: type<void>()
  }
});
