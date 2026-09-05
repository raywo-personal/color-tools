import {Events} from "@ngrx/signals/events";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import {tap} from "rxjs";
import {colorName} from "@engine/color/color-name.helper";
import {contrastEvents} from "./contrast.events";
import {AppStateStore} from "../app-state.store";


/**
 * Announces the pair `SWAP` and the random roll produced.
 *
 * Both replace text and background at once without moving focus, and neither
 * button says what came back - unlike a field, a picker or a palette chip,
 * whose own name carries the color it sets. Without the announcement a screen
 * reader is told nothing at all.
 *
 * Polite, not assertive: the visitor pressed the button and is still standing
 * on it, so there is nothing in progress to interrupt.
 *
 * One effect for both events, because the sentence is the same shape and the
 * pair is what either of them changed. The opening word tells them apart, so a
 * swap that happens to roll past is not read as a new pair.
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
    .on(contrastEvents.switchColors, contrastEvents.newRandomColorsWithNav)
    .pipe(
      tap(event => {
        const {text, background} = typedStore.contrastColors();
        const opening = event.type === contrastEvents.switchColors.type
          ? "Swapped"
          : "New pair";

        void announcer.announce(
          `${opening}: ${colorName(text)} on ${colorName(background)}`,
          "polite"
        );
      })
    );
}
