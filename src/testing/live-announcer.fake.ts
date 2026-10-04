import {Provider} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {AriaLivePoliteness, LiveAnnouncer} from "@angular/cdk/a11y";


/** What was announced, and how urgently. */
export interface Announcement {
  readonly message: string;
  readonly politeness: AriaLivePoliteness;
}


/**
 * `LiveAnnouncer`'s own default, applied when a caller omits the politeness.
 *
 * The recorder writes down what would have been spoken, not the argument that
 * was left out - otherwise a spec asserting "polite" would pass on a call that
 * never set a politeness at all.
 */
const DEFAULT_POLITENESS: AriaLivePoliteness = "polite";


/**
 * A `LiveAnnouncer` that says nothing and remembers everything.
 *
 * The real service appends a live region to the document and speaks on a
 * timeout, so a spec that spies on it still leaves that region behind and has
 * to remember to make `announce` resolve. This one replaces the service
 * outright: nothing reaches the DOM, and the announcement is a value a test can
 * compare.
 *
 * It records the politeness as well as the message, because an announcement
 * that interrupts and one that waits are different outcomes - see the rejected
 * field in `color-controls.ts` against the rolled color in
 * `converter.effects.ts`.
 */
export class FakeLiveAnnouncer {

  readonly #announcements: Announcement[] = [];

  /** Everything announced so far, oldest first. */
  get announcements(): readonly Announcement[] {
    return this.#announcements;
  }

  /** The most recent announcement, or `undefined` while nothing was said. */
  get last(): Announcement | undefined {
    return this.#announcements.at(-1);
  }


  /**
   * Mirrors the real overloads: the second argument is the politeness when it
   * is a string and the duration otherwise, so a caller passing only a duration
   * is still recorded as polite rather than as a number.
   */
  public announce(message: string, ...rest: unknown[]): Promise<void> {
    const politeness = typeof rest[0] === "string"
      ? rest[0] as AriaLivePoliteness
      : DEFAULT_POLITENESS;

    this.#announcements.push({message, politeness});

    return Promise.resolve();
  }


  /**
   * Nothing was rendered, so there is nothing to clear. It exists because the
   * fake stands in for the whole service, and a component calling it must not
   * fall over - the recording is deliberately left alone.
   */
  public clear(): void {
    // Intentionally empty.
  }

}


/**
 * Puts the fake in front of `LiveAnnouncer` for the current TestBed. Add it to
 * the providers, then read the announcements with `fakeLiveAnnouncer()`.
 */
export function provideFakeLiveAnnouncer(): Provider {
  return {
    provide: LiveAnnouncer,
    useFactory: () => new FakeLiveAnnouncer() as unknown as LiveAnnouncer
  };
}


/**
 * The fake the TestBed is using, so a spec never casts the injected service
 * itself. It throws rather than returning the real announcer, because a silent
 * fallback would record nothing and every assertion below it would fail on an
 * empty list instead of naming the missing provider.
 */
export function fakeLiveAnnouncer(): FakeLiveAnnouncer {
  const announcer = TestBed.inject(LiveAnnouncer);

  if (!(announcer instanceof FakeLiveAnnouncer)) {
    throw new Error(
      "LiveAnnouncer is the real service. Add provideFakeLiveAnnouncer() to the TestBed providers."
    );
  }

  return announcer;
}
