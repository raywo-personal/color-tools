import {TestBed} from "@angular/core/testing";
import {provideRouter, Router} from "@angular/router";
import {provideZonelessChangeDetection} from "@angular/core";
import {beforeEach, describe, expect, it} from "vitest";
import {routes} from "./app.routes";
import {Studio} from "@studio/components/studio/studio";
import {ContrastType} from "@contrast-type/components/contrast-type/contrast-type";
import {NotFound} from "@common/components/not-found/not-found";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {isRestorablePaletteSegment, PALETTE_SEGMENT_LENGTH, paletteSegmentFrom} from "@engine/palette/palette-segment.helper";
import {
  ADDRESS_SEPARATOR,
  contrastTypeAddressFrom,
  isRestorableContrastTypeAddress
} from "@contrast-type/models/contrast-type-address.model";
import {DEFAULT_TYPE_SETTINGS_BY_ROLE} from "@engine/contrast/type-role.model";


describe("app routes", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes)
      ]
    });
  });


  async function activatedComponentFor(path: string) {
    const router = TestBed.inject(Router);
    await router.navigateByUrl(path);

    let snapshot = router.routerState.snapshot.root;
    while (snapshot.firstChild) snapshot = snapshot.firstChild;

    return {component: snapshot.component, title: snapshot.title, url: router.url, data: snapshot.data};
  }


  /** The path of a url without its fragment, as segments. */
  function segmentsOf(url: string): string[] {
    return url.split("#")[0].split("/").slice(1);
  }


  const palette = generatePaletteFrom(chroma("#3366cc"), "triadic", 11);
  const studioSegment = paletteSegmentFrom(palette, 11);
  const contrastAddress = contrastTypeAddressFrom({
    palette,
    seed: 11,
    text: chroma("#102030"),
    background: chroma("#f0e0d0"),
    type: {
      display: {family: null, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.display},
      body: {family: null, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.body},
      mono: {family: null, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.mono},
      ui: {family: null, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.ui}
    },
    placements: {headline: {ink: "color3"}}
  });


  describe("the two views", () => {

    it("puts the studio on the start page, at the address of the state it has", async () => {
      const store = TestBed.inject(AppStateStore);
      const current = paletteSegmentFrom(store.currentPalette(), store.paletteSeed());

      const {component, url} = await activatedComponentFor("/");

      expect(component).toBe(Studio);
      expect(url).toBe(`/${current}`);
    });


    it("gives contrast & type a path of its own, at the address of the page it has", async () => {
      const {component, url} = await activatedComponentFor("/contrast");
      const [path, ...address] = segmentsOf(url);

      expect(component).toBe(ContrastType);
      expect(path).toBe("contrast");
      expect(isRestorableContrastTypeAddress(address.join(ADDRESS_SEPARATOR))).toBe(true);
    });


    it("titles both views", async () => {
      const studio = await activatedComponentFor("/");
      const contrast = await activatedComponentFor("/contrast");

      expect(studio.title).toBe("ColorTools – Studio");
      expect(contrast.title).toBe("ColorTools – Contrast & Type");
    });

  });


  describe("the shared links", () => {

    it("opens a studio link on the palette it was written with", async () => {
      const {component, url} = await activatedComponentFor(`/${studioSegment}`);

      expect(component).toBe(Studio);
      expect(url).toBe(`/${studioSegment}`);
      expect(TestBed.inject(AppStateStore).currentPalette().id).toBe(palette.id);
    });


    it("opens a contrast & type link on the page it was written with", async () => {
      const {component, url} = await activatedComponentFor(`/contrast/${contrastAddress}`);
      const store = TestBed.inject(AppStateStore);

      expect(component).toBe(ContrastType);
      expect(url).toBe(`/contrast/${contrastAddress}`);
      expect(store.currentPalette().id).toBe(palette.id);
      expect(store.placements()).toEqual({headline: {ink: "color3"}});
    });


    it("opens a contrast & type link whose trailing commas a chat client cut off", async () => {
      expect(contrastAddress.endsWith(",,,")).toBe(true);

      const {component} = await activatedComponentFor(`/contrast/${contrastAddress.slice(0, -3)}`);
      const store = TestBed.inject(AppStateStore);

      expect(component).toBe(ContrastType);
      expect(store.currentPalette().id).toBe(palette.id);
      expect(store.placements()).toEqual({headline: {ink: "color3"}});
    });


    it("opens a tab on the state the visitor already has", async () => {
      await activatedComponentFor(`/contrast/${contrastAddress}`);

      const {url} = await activatedComponentFor("/");

      expect(url).toBe(`/${studioSegment}`);

      const contrast = await activatedComponentFor("/contrast");

      expect(contrast.url).toBe(`/contrast/${contrastAddress}`);
    });


    it("lands a studio link it cannot read on a freshly rolled palette", async () => {
      const unreadable = "z".repeat(PALETTE_SEGMENT_LENGTH);

      const {component, url} = await activatedComponentFor(`/${unreadable}`);
      const [segment] = segmentsOf(url);

      expect(component).toBe(Studio);
      expect(isRestorablePaletteSegment(segment)).toBe(true);
    });


    it("lands a contrast & type link it cannot read on a freshly rolled palette", async () => {
      const {component, url} = await activatedComponentFor(`/contrast/${"z".repeat(PALETTE_SEGMENT_LENGTH)}/0/,,,`);
      const [, ...address] = segmentsOf(url);

      expect(component).toBe(ContrastType);
      expect(isRestorableContrastTypeAddress(address.join(ADDRESS_SEPARATOR))).toBe(true);
    });


    it("keeps the fragment through the redirect", async () => {
      const studio = await activatedComponentFor("/#palette");
      const contrast = await activatedComponentFor("/contrast#preview");

      expect(studio.url.endsWith("#palette")).toBe(true);
      expect(contrast.url.endsWith("#preview")).toBe(true);
    });

  });


  describe("the wildcard route", () => {

    it("catches an unknown top level path", async () => {
      const {component, url} = await activatedComponentFor("/does-not-exist");

      expect(component).toBe(NotFound);
      expect(url).toBe("/does-not-exist");
    });


    it("catches a mistyped one segment path rather than opening the studio", async () => {
      const {component, url} = await activatedComponentFor("/contrsat");

      expect(component).toBe(NotFound);
      expect(url).toBe("/contrsat");
    });


    it("catches a second segment behind a studio address", async () => {
      const {component} = await activatedComponentFor(`/${studioSegment}/extra`);

      expect(component).toBe(NotFound);
    });


    it("catches extra segments below a known route", async () => {
      const {component} = await activatedComponentFor("/contrast/extra");

      expect(component).toBe(NotFound);
    });


    it("catches a v1 url", async () => {
      const {component} = await activatedComponentFor("/convert");

      expect(component).toBe(NotFound);
    });


    it("sets a page title", async () => {
      const {title} = await activatedComponentFor("/does-not-exist");

      expect(title).toBe("ColorTools – Page not found");
    });


    it("opts out of the app header, because the page carries one of its own", async () => {
      const {data} = await activatedComponentFor("/does-not-exist");

      expect(data["appHeader"]).toBe(false);
    });

  });

});
