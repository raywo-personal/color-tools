import {computed, Provider, signal} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {GoogleFont, GoogleFontsApiResponse} from "@common/models/google-font.model";
import {GoogleFontsService} from "@common/services/google-fonts.service";


/**
 * A catalog entry, with the fields the app reads filled in and the rest at a
 * value that says it is not real.
 */
export function googleFont(family: string,
                           category: string,
                           variants: string[]): GoogleFont {
  return {
    family,
    category,
    variants,
    subsets: ["latin"],
    version: "v1",
    lastModified: "2020-01-01",
    files: {},
    kind: "webfonts#webfont"
  };
}


/**
 * A small catalog, in popularity order like the real one.
 *
 * The variants are the point: a family with many weights, one with two, and
 * two that ship a single weight - which is the case the WEIGHT slider has to
 * survive.
 */
export const FAKE_FONTS: readonly GoogleFont[] = [
  googleFont("Roboto", "sans-serif", ["100", "300", "regular", "500", "700", "900", "italic"]),
  googleFont("Open Sans", "sans-serif", ["300", "regular", "600", "700", "800", "300italic"]),
  googleFont("Playfair Display", "serif", ["regular", "500", "600", "700", "800", "900"]),
  googleFont("Roboto Mono", "monospace", ["regular"]),
  googleFont("Lobster", "display", ["regular"]),
  googleFont("Merriweather", "serif", ["300", "regular", "700", "900"])
];


/**
 * A `GoogleFontsService` that answers from a list a spec sets.
 *
 * The real service builds an `httpResource` in a field initializer, so every
 * component that reaches the catalog would otherwise drag `HttpClient` and a
 * pending request into every spec that renders the contrast screen - and a
 * request that never resolves keeps the fixture from ever going stable.
 *
 * **The search here is a plain substring match, not the service's ranking.**
 * What a spec on the picker is about is the control - what the list shows,
 * what the keyboard does with it - and a second copy of the scoring would only
 * pin the copy.
 */
export class FakeGoogleFonts {

  readonly items = signal<readonly GoogleFont[]>(FAKE_FONTS);
  readonly loading = signal(false);
  readonly failure = signal<Error | undefined>(undefined);

  /** How often the control asked for the catalog again. */
  reloads = 0;

  readonly googleFonts = {
    value: computed<GoogleFontsApiResponse | undefined>(() =>
      this.failure() || this.loading()
        ? undefined
        : {kind: "webfonts#webfontList", items: [...this.items()]}
    ),
    isLoading: this.loading.asReadonly(),
    error: this.failure.asReadonly(),
    reload: () => {
      this.reloads++;

      return true;
    }
  };


  public searchFonts(query: string, limit = 20): GoogleFont[] {
    const needle = query.trim().toLowerCase();

    if (!needle) return [];

    return this.items()
      .filter(font => font.family.toLowerCase().includes(needle))
      .slice(0, limit);
  }


  /** Puts the catalog into the state a failed request leaves it in. */
  public fail(message = "offline"): void {
    this.loading.set(false);
    this.failure.set(new Error(message));
  }


  /** Puts it back, the way a successful retry would. */
  public succeed(): void {
    this.loading.set(false);
    this.failure.set(undefined);
  }

}


/**
 * Puts the fake in front of `GoogleFontsService` for the current TestBed. Add
 * it to the providers, then reach the catalog with `fakeGoogleFonts()`.
 */
export function provideFakeGoogleFonts(): Provider {
  return {
    provide: GoogleFontsService,
    useFactory: () => new FakeGoogleFonts() as unknown as GoogleFontsService
  };
}


/**
 * The fake the TestBed is using, so a spec never casts the injected service
 * itself. It throws rather than returning the real one, because the real one
 * would fire an HTTP request and every assertion below would fail on an empty
 * catalog instead of naming the missing provider.
 */
export function fakeGoogleFonts(): FakeGoogleFonts {
  const fonts = TestBed.inject(GoogleFontsService);

  if (!(fonts instanceof FakeGoogleFonts)) {
    throw new Error(
      "GoogleFontsService is the real service. Add provideFakeGoogleFonts() to the TestBed providers."
    );
  }

  return fonts;
}
