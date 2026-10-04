import {Provider} from "@angular/core";
import {GoogleFontLoaderService} from "@common/services/google-font-loader.service";


/**
 * A font loader that loads nothing.
 *
 * The real one appends `<link rel="stylesheet">` elements to the head, and
 * happy-dom fetches them - so every spec that raises `fontSelected` or
 * `loadAppState` would otherwise put a request to fonts.googleapis.com behind
 * an assertion about a `font-family` string, and offline print a NetworkError
 * under a green summary. The two members are the whole of what the effects
 * call.
 */
export class SilentFontLoader {

  public loadFonts(): void {
    // Intentionally empty.
  }

  public setFontFamily(): void {
    // Intentionally empty.
  }

}


/** Puts the silent loader in front of `GoogleFontLoaderService` for the current TestBed. */
export function provideSilentFontLoader(): Provider {
  return {provide: GoogleFontLoaderService, useClass: SilentFontLoader};
}
