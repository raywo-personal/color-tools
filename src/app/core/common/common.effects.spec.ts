import {ApplicationRef, provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {commonEvents} from "@core/common/common.events";
import {persistenceEvents} from "@core/common/persistence.events";
import {contrastEvents} from "@core/contrast/contrast.events";
import {fontNamed, SelectedFont} from "@common/models/google-font.model";
import {LOCAL_STORAGE_KEY, SettingsMap} from "@common/models/local-storage.model";
import {GoogleFontLoaderService} from "@common/services/google-font-loader.service";
import {GoogleFontsService} from "@common/services/google-fonts.service";
import {fakeLiveAnnouncer, provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {fakeGoogleFonts, FakeGoogleFonts, provideFakeGoogleFonts} from "@testing/google-fonts.fake";
import {storePage} from "@testing/stored-address";
import {AddressedType, ContrastTypePage, contrastTypeAddressFrom} from "@contrast-type/models/contrast-type-address.model";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {DEFAULT_TYPE_SETTINGS_BY_ROLE, TypeRole} from "@engine/contrast/type-role.model";


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
        // The faces a reload restores are completed from the catalogue.
        provideFakeGoogleFonts(),
        {provide: GoogleFontLoaderService, useValue: loader}
      ]
    });
  });


  it("puts the restored faces into the head on a reload", () => {
    // A reload never raises `fontSelected` - the load reducer writes the faces
    // straight into the state. Without this leg the preview sets a
    // `font-family` whose stylesheet is not in the head.
    storePage(pageSetIn({display: "Playfair Display", body: "Merriweather"}));

    // The store registers its effects when it is created, so an event
    // dispatched before that is lost. In an injection context because the
    // load reducer injects the storage, as it does from the app initializer.
    TestBed.inject(AppStateStore);
    TestBed.runInInjectionContext(
      () => TestBed.inject(Dispatcher).dispatch(persistenceEvents.loadAppState())
    );

    expect(loader.lastLoaded).toEqual([fontNamed("Playfair Display"), fontNamed("Merriweather"), null, null]);
    expect(loader.families.at(-1)).toEqual(fontNamed("Merriweather"));
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


describe("resolveFontsEffect", () => {

  /** How often the catalogue was created, which is when it is requested. */
  let catalogueRequests: number;

  beforeEach(() => {
    localStorage.clear();
    catalogueRequests = 0;
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFakeLiveAnnouncer(),
        {provide: GoogleFontLoaderService, useValue: new RecordingFontLoader()},
        {
          provide: GoogleFontsService,
          useFactory: () => {
            catalogueRequests++;

            return new FakeGoogleFonts() as unknown as GoogleFontsService;
          }
        }
      ]
    });
  });


  async function reloaded() {
    const store = TestBed.inject(AppStateStore);

    TestBed.runInInjectionContext(
      () => TestBed.inject(Dispatcher).dispatch(persistenceEvents.loadAppState())
    );
    await TestBed.inject(ApplicationRef).whenStable();

    return store;
  }


  it("completes a face that came back by name with its category and weights", async () => {
    storePage(pageSetIn({display: "Playfair Display"}, {display: {fontSize: 44, fontWeight: 600, lineHeight: 1.1}}));

    const store = await reloaded();
    const {font, settings} = store.typeRoles().display;

    expect(font?.category).toBe("serif");
    expect(font?.weights).toEqual([400, 500, 600, 700, 800, 900]);
    expect(settings.fontWeight).toBe(600);
  });


  it("keeps the weight the address set until the catalogue says the face does not ship it", async () => {
    // Playfair Display starts at 400: a 300 the address carries stands by
    // name, and the completed face moves it to the lightest weight it has.
    storePage(pageSetIn({display: "Playfair Display"}, {display: {fontSize: 44, fontWeight: 300, lineHeight: 1.1}}));
    fakeGoogleFonts().loading.set(true);

    const store = await reloaded();

    expect(store.typeRoles().display.settings.fontWeight).toBe(300);

    fakeGoogleFonts().succeed();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.typeRoles().display.settings.fontWeight).toBe(400);
  });


  it("puts a family the catalogue does not carry back on the app's own type", async () => {
    storePage(pageSetIn({body: "No Such Family"}));

    const store = await reloaded();

    expect(store.typeRoles().body.font).toBeNull();
  });


  it("completes a face a restore from the address brought, and announces nothing", async () => {
    const store = TestBed.inject(AppStateStore);

    TestBed.inject(Dispatcher).dispatch(contrastEvents.restoreContrastType(
      contrastTypeAddressFrom(pageSetIn({ui: "Roboto"}))
    ));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.typeRoles().ui.font?.weights).toEqual([100, 300, 400, 500, 700, 900]);
    expect(fakeLiveAnnouncer().announcements).toEqual([]);
  });


  it("does not ask for the catalogue while every role is on the app's own type", async () => {
    storePage(pageSetIn({}));

    await reloaded();

    expect(catalogueRequests).toBe(0);
  });


  it("leaves the faces by name and the other effects running where the catalogue fails", async () => {
    // Every effect of the store runs in one subscription, so an error in
    // this one would stop the persistence, the font loading and the
    // announcements with it.
    storePage(pageSetIn({body: "Merriweather"}));
    fakeGoogleFonts().fail();

    const store = await reloaded();

    expect(store.typeRoles().body.font).toEqual(fontNamed("Merriweather"));

    TestBed.inject(Dispatcher).dispatch(commonEvents.colorThemeChanged("dark"));
    TestBed.inject(Dispatcher).dispatch(commonEvents.colorThemeChanged("light"));

    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) ?? "{}") as Partial<SettingsMap>;

    expect(stored.colorTheme).toBe("light");

    // The picker offers the request again; an answer then completes the face.
    fakeGoogleFonts().succeed();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.typeRoles().body.font?.weights).toEqual([300, 400, 700, 900]);
  });

});


/** A page whose roles are set in the given families, the others in the app's own type. */
function pageSetIn(families: Partial<Record<TypeRole, string>>,
                   settings: Partial<Record<TypeRole, AddressedType["settings"]>> = {}): ContrastTypePage {
  const type = (role: TypeRole): AddressedType => ({
    family: families[role] ?? null,
    settings: settings[role] ?? DEFAULT_TYPE_SETTINGS_BY_ROLE[role]
  });

  return {
    palette: generatePaletteFrom(chroma("#3366cc"), "triadic", 3),
    seed: 3,
    text: chroma("#111111"),
    background: chroma("#f5f5f5"),
    type: {display: type("display"), body: type("body"), mono: type("mono"), ui: type("ui")},
    placements: {}
  };
}
