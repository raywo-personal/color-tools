import {Events} from "@ngrx/signals/events";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import {tap} from "rxjs";
import {colorName} from "@engine/color/color-name.helper";
import {contrastEvents} from "./contrast.events";
import {transferEvents} from "@core/common/transfer.events";
import {AppStateStore} from "../app-state.store";


/**
 * The opening word per gesture, so a swap that happens to roll past is not
 * read as a new pair and neither is mistaken for the palette's own.
 */
const OPENINGS: Record<string, string> = {
  [contrastEvents.switchColors.type]: "Swapped",
  [contrastEvents.newRandomColorsWithNav.type]: "New pair",
  [transferEvents.sendPaletteToContrast.type]: "From the palette"
};


/**
 * Announces the pair `SWAP`, the random roll and `PALETTE PAIR` produced.
 *
 * All three replace text and background at once without moving focus, and no
 * button says what came back - unlike a field, a picker or a palette chip,
 * whose own name carries the color it sets. Without the announcement a screen
 * reader is told nothing at all.
 *
 * Polite, not assertive: the visitor pressed the button and is still standing
 * on it, so there is nothing in progress to interrupt.
 *
 * One effect for all three events, because the sentence is the same shape and
 * the pair is what each of them changed. The opening word tells them apart -
 * see `OPENINGS`.
 *
 * An effect rather than the buttons, so the announcement travels with the
 * event and not with one caller of it. The reducer has run by the time an
 * effect sees the event, so the store already holds the new pair.
 */
export function contrastPairAnnouncedEffect(
  this: void,
  events: Events,
  announcer: LiveAnnouncer,
  store: unknown
) {
  const typedStore = store as AppStateStore;

  return events
    .on(
      contrastEvents.switchColors,
      contrastEvents.newRandomColorsWithNav,
      transferEvents.sendPaletteToContrast
    )
    .pipe(
      tap(event => {
        const {text, background} = typedStore.contrastColors();
        const opening = OPENINGS[event.type];

        void announcer.announce(
          `${opening}: ${colorName(text)} on ${colorName(background)}`,
          "polite"
        );
      })
    );
}
