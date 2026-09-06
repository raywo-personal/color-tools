import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import {AppStateStore} from "@core/app-state.store";
import {commonEvents} from "@core/common/common.events";
import {persistenceEvents} from "@core/common/persistence.events";
import {LOCAL_STORAGE_KEY} from "@common/models/local-storage.model";
import {SelectedFont} from "@common/models/google-font.model";
import {GoogleFontLoaderService} from "@common/services/google-font-loader.service";
import {provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";


/** A selection as the picker builds one. */
function selection(family: string, weights: number[], category = "serif"): SelectedFont {
  return {family, category, variant: "regular", weights};
}


/**
 * A loader that writes down what it was handed instead of touching the head.
 *
 * The two members are the whole of what the effects call; the last call is
 * what a spec compares, because every event hands the loader the complete
 * set of faces and the earlier calls say nothing the last one does not.
 */
class RecordingFontLoader {

  public loaded: (readonly (SelectedFont | null)[])[] = [];
  public families: (SelectedFont | null)[] = [];

  public loadFonts(fonts: Iterable<SelectedFont | null>): void {
    this.loaded.push([...fonts]);
  }

  public setFontFamily(font: SelectedFont | null): void {
    this.families.push(font);
  }

  get lastLoaded(): readonly (SelectedFont | null)[] | undefined {
    return this.loaded.at(-1);
  }

}


describe("loadFontsEffect", () => {

  let loader: RecordingFontLoader;

  beforeEach(() => {
    localStorage.clear();
    loader = new RecordingFontLoader();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        // Picking a face raises an announcement as well.
        provideFakeLiveAnnouncer(),
        {provide: GoogleFontLoaderService, useValue: loader}
      ]
    });
  });


  it("puts the restored faces into the head on a reload", () => {
    // A reload never raises `fontSelected` - the load reducer writes the faces
    // straight into the state. Without this leg the preview sets a
    // `font-family` whose stylesheet is not in the head.
    const display = selection("Source Serif 4", [400, 600, 700]);
    const body = selection("Merriweather", [300, 400, 700, 900]);

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      typeRoles: {
        display: {font: display, settings: {fontSize: 44, fontWeight: 600, lineHeight: 1.1}},
        body: {font: body, settings: {fontSize: 18, fontWeight: 400, lineHeight: 1.6}}
      }
    }));

    // The store registers its effects when it is created, so an event
    // dispatched before that is lost. In an injection context because the
    // load reducer injects the storage, as it does from the app initializer.
    TestBed.inject(AppStateStore);
    TestBed.runInInjectionContext(
      () => TestBed.inject(Dispatcher).dispatch(persistenceEvents.loadAppState())
    );

    expect(loader.lastLoaded).toEqual([display, body, null, null]);
    expect(loader.families.at(-1)).toEqual(body);
  });


  it("hands the loader every role's face after a pick, not only the picked one", () => {
    // The loader takes out what no role reads any more, so a call carrying one
    // role's face alone would remove the other roles' stylesheets.
    const display = selection("Source Serif 4", [400, 600, 700]);
    const ui = selection("Lobster", [400], "display");

    TestBed.inject(AppStateStore);
    const dispatcher = TestBed.inject(Dispatcher);

    dispatcher.dispatch(commonEvents.fontSelected({role: "display", font: display}));
    dispatcher.dispatch(commonEvents.fontSelected({role: "ui", font: ui}));

    expect(loader.lastLoaded).toEqual([display, null, null, ui]);
  });


  it("publishes body text's face as the custom property, and no other role's", () => {
    // `setFontFamily()` is what the v1 contrast screen reads; a display face
    // there would set the old screen's samples in the headline's type.
    const display = selection("Source Serif 4", [400, 600, 700]);

    TestBed.inject(AppStateStore);
    TestBed.inject(Dispatcher).dispatch(commonEvents.fontSelected({role: "display", font: display}));

    expect(loader.families.at(-1)).toBeNull();
  });

});
