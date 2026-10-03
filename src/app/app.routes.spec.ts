import {TestBed} from "@angular/core/testing";
import {provideRouter, Router} from "@angular/router";
import {ApplicationRef, provideZonelessChangeDetection} from "@angular/core";
import {Location} from "@angular/common";
import {Dispatcher, EventInstance, Events} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it, vi} from "vitest";
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
  ContrastTypePage,
  isRestorableContrastTypeAddress
} from "@contrast-type/models/contrast-type-address.model";
import {DEFAULT_TYPE_SETTINGS_BY_ROLE} from "@engine/contrast/type-role.model";
import {converterEvents} from "@core/converter/converter.events";
import {palettesEvents} from "@core/palettes/palettes.events";
import {contrastEvents} from "@core/contrast/contrast.events";
import {commonEvents} from "@core/common/common.events";
import {transferEvents} from "@core/common/transfer.events";
import {contrastTypePageOf} from "@core/contrast/contrast.reducers";
import {fontNamed} from "@common/models/google-font.model";
import {GoogleFontLoaderService} from "@common/services/google-font-loader.service";
import {SilentFontLoader} from "@testing/font-loader.fake";
import {GoogleFontsService} from "@common/services/google-fonts.service";
import {FakeGoogleFonts} from "@testing/google-fonts.fake";
import {isRestorablePaletteId, PALETTE_ID_BASE62_LENGTH, paletteIdFrom} from "@engine/palette/palette-id.helper";
import {CONTRAST_ID_LENGTH, contrastIdFromColors, isRestorableContrastId} from "@engine/contrast/contrast-id.helper";
import {readFileSync} from "node:fs";


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
  const contrastPage: ContrastTypePage = {
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
  };
  const contrastAddress = contrastTypeAddressFrom(contrastPage);


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


  describe("the v1 links", () => {

    it("opens a v1 palette link on the palette it was written with", async () => {
      const v1Id = paletteIdFrom(palette, palette.style);

      const {component, url} = await activatedComponentFor(`/palettes/${v1Id}`);
      const [segment] = segmentsOf(url);

      expect(component).toBe(Studio);
      expect(isRestorablePaletteSegment(segment)).toBe(true);
      expect(segment.startsWith(v1Id)).toBe(true);
      expect(TestBed.inject(AppStateStore).currentPalette().id).toBe(v1Id);
    });


    it("opens a v1 contrast link on its pair, with the visitor's palette and type and no placements", async () => {
      await activatedComponentFor(`/contrast/${contrastAddress}`);
      const store = TestBed.inject(AppStateStore);
      const typeRoles = store.typeRoles();
      const v1Id = contrastIdFromColors({text: chroma("#203040"), background: chroma("#e0f0d0")});

      const {component, url} = await activatedComponentFor(`/contrast/${v1Id}`);
      const [, ...address] = segmentsOf(url);

      expect(component).toBe(ContrastType);
      expect(isRestorableContrastTypeAddress(address.join(ADDRESS_SEPARATOR))).toBe(true);
      expect(store.contrastColors().text.hex()).toBe("#203040");
      expect(store.contrastColors().background.hex()).toBe("#e0f0d0");
      expect(store.currentPalette().id).toBe(palette.id);
      expect(store.paletteSeed()).toBe(11);
      expect(store.typeRoles()).toEqual(typeRoles);
      expect(store.placements()).toEqual({});
    });


    it("lands a v1 palette link it cannot read on a freshly rolled palette", async () => {
      const unreadable = "z".repeat(PALETTE_ID_BASE62_LENGTH);
      expect(isRestorablePaletteId(unreadable)).toBe(false);

      const {component, url} = await activatedComponentFor(`/palettes/${unreadable}`);
      const [segment] = segmentsOf(url);

      expect(component).toBe(Studio);
      expect(isRestorablePaletteSegment(segment)).toBe(true);
    });


    it("lands a v1 contrast link it cannot read on a freshly rolled palette", async () => {
      const unreadable = "z".repeat(CONTRAST_ID_LENGTH);
      expect(isRestorableContrastId(unreadable)).toBe(false);

      const {component, url} = await activatedComponentFor(`/contrast/${unreadable}`);
      const [, ...address] = segmentsOf(url);

      expect(component).toBe(ContrastType);
      expect(isRestorableContrastTypeAddress(address.join(ADDRESS_SEPARATOR))).toBe(true);
    });


    it("keeps the fragment through the redirect", async () => {
      const v1Palette = paletteIdFrom(palette, palette.style);
      const v1Pair = contrastIdFromColors({text: chroma("#203040"), background: chroma("#e0f0d0")});

      const studio = await activatedComponentFor(`/palettes/${v1Palette}#palette`);
      const contrast = await activatedComponentFor(`/contrast/${v1Pair}#preview`);

      expect(studio.url.endsWith("#palette")).toBe(true);
      expect(contrast.url.endsWith("#preview")).toBe(true);
    });


    it("leaves a path that was never a v1 link to the not-found page", async () => {
      const {component} = await activatedComponentFor("/palettes/extra");

      expect(component).toBe(NotFound);
    });

  });


  describe("the files the server reads first", () => {

    it("answers the v1 paths without an id with a 301 to the start page, ahead of the app", () => {
      const rules = readFileSync("public/_redirects", "utf8")
        .split("\n")
        .map(line => line.trim())
        .filter(line => line !== "" && !line.startsWith("#"))
        .map(line => line.split(/\s+/));
      const fallback = rules.findIndex(([from]) => from === "/*");

      for (const path of ["/convert", "/palettes"]) {
        const index = rules.findIndex(([from]) => from === path);

        expect(rules[index]).toEqual([path, "/", "301"]);
        expect(index).toBeLessThan(fallback);
      }
    });


    it("lists only addresses the app answers in the sitemap", async () => {
      const paths = [...readFileSync("public/sitemap.xml", "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map(([, loc]) => new URL(loc).pathname);

      expect(paths.length).toBeGreaterThan(0);

      for (const path of paths) {
        const {component} = await activatedComponentFor(path);

        expect(component, path).not.toBe(NotFound);
      }
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


    it("catches a v1 path without an id, which the server redirects before the app loads", async () => {
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


  describe("the address bar", () => {

    /** Opens a path and waits until the router has settled on it. */
    async function openAt(path: string) {
      const store = TestBed.inject(AppStateStore);
      const router = TestBed.inject(Router);

      await router.navigateByUrl(path);

      const location = TestBed.inject(Location);
      const pushes = vi.spyOn(location, "go");
      const replaces = vi.spyOn(location, "replaceState");

      return {store, router, pushes, replaces};
    }


    async function dispatch(event: EventInstance<string, unknown>) {
      TestBed.inject(Dispatcher).dispatch(event);
      await TestBed.inject(ApplicationRef).whenStable();
    }


    function studioUrlOf(store: AppStateStore): string {
      return `/${paletteSegmentFrom(store.currentPalette(), store.paletteSeed())}`;
    }


    function contrastUrlOf(store: AppStateStore): string {
      const address = contrastTypeAddressFrom(contrastTypePageOf({
        currentPalette: store.currentPalette(),
        paletteSeed: store.paletteSeed(),
        contrastColors: store.contrastColors(),
        typeRoles: store.typeRoles(),
        placements: store.placements()
      }));

      return TestBed.inject(Router).serializeUrl(TestBed.inject(Router).parseUrl(`/contrast/${address}`));
    }


    /** Counts the restores the guards raise from here on. */
    function countRestores(): () => number {
      let count = 0;
      TestBed.inject(Events)
        .on(palettesEvents.restorePalette, contrastEvents.restoreContrastType)
        .subscribe(() => count++);

      return () => count;
    }


    describe("on the Studio", () => {

      it("moves the address to the colour the visitor committed", async () => {
        const {store, router} = await openAt("/");
        const before = router.url;

        await dispatch(converterEvents.colorChanged(chroma("#3366cc")));

        expect(router.url).not.toBe(before);
        expect(router.url).toBe(studioUrlOf(store));
      });


      it("replaces the history entry rather than adding one", async () => {
        const {pushes, replaces} = await openAt("/");

        await dispatch(converterEvents.colorChanged(chroma("#3366cc")));

        expect(pushes).not.toHaveBeenCalled();
        expect(replaces).toHaveBeenCalled();
      });


      it("leaves the address alone while a drag is still going", async () => {
        const {router} = await openAt("/");
        const before = router.url;

        await dispatch(converterEvents.colorAdjusted(chroma("#3366cc")));

        expect(router.url).toBe(before);
      });


      it("does not restore the address it has just written", async () => {
        await openAt("/");
        const restores = countRestores();

        await dispatch(converterEvents.colorChanged(chroma("#3366cc")));
        await dispatch(palettesEvents.styleChanged("triadic"));

        expect(restores()).toBe(0);
      });


      it("drops the fragment, so the page does not scroll to the section", async () => {
        const {router} = await openAt("/#palette");

        await dispatch(converterEvents.colorChanged(chroma("#3366cc")));

        expect(router.url).not.toContain("#");
      });


      it("follows a new style and does not open Contrast & Type for it", async () => {
        const {store, router} = await openAt("/");

        await dispatch(palettesEvents.styleChanged("triadic"));

        expect(router.url).toBe(studioUrlOf(store));
      });

    });


    describe("on Contrast & Type", () => {

      it("follows the pair, the type and the placements", async () => {
        const {store, router} = await openAt("/contrast");

        await dispatch(contrastEvents.textColorChanged(chroma("#102030")));
        expect(router.url).toBe(contrastUrlOf(store));

        const body = store.typeRoles().body.settings;
        await dispatch(commonEvents.typeSettingsChanged({role: "body", settings: {...body, fontSize: body.fontSize + 1}}));
        expect(router.url).toBe(contrastUrlOf(store));

        await dispatch(contrastEvents.colorPlaced({elementKey: "headline", side: "ink", source: "color3"}));
        expect(router.url).toBe(contrastUrlOf(store));
        expect(store.placements()).toEqual({headline: {ink: "color3"}});
      });


      it("replaces the history entry rather than adding one", async () => {
        const {pushes, replaces} = await openAt("/contrast");

        await dispatch(contrastEvents.switchColors());

        expect(pushes).not.toHaveBeenCalled();
        expect(replaces).toHaveBeenCalled();
      });


      it("leaves the address alone while a drag is still going", async () => {
        const {router} = await openAt("/contrast");
        const before = router.url;

        await dispatch(contrastEvents.textColorAdjusted(chroma("#102030")));

        expect(router.url).toBe(before);
      });


      it("does not restore the address it has just written", async () => {
        await openAt("/contrast");
        const restores = countRestores();

        await dispatch(contrastEvents.textColorChanged(chroma("#102030")));
        await dispatch(contrastEvents.placementsReset());

        expect(restores()).toBe(0);
      });


      it("recognises its own address when a family name has to be encoded", async () => {
        TestBed.overrideProvider(GoogleFontLoaderService, {useValue: new SilentFontLoader()});
        const {store, router} = await openAt("/contrast");
        const restores = countRestores();

        await dispatch(commonEvents.fontSelected({role: "body", font: fontNamed("Open Sans")}));

        expect(router.url).toBe(contrastUrlOf(store));
        expect(restores()).toBe(0);
      });


      it("drops a face the catalogue does not list, in the same history entry", async () => {
        // A link naming a family Google does not serve: the catalogue sets the
        // role back to the app's type, and the address follows without a
        // gesture. Back must not lead to the address that named it.
        const fonts = new FakeGoogleFonts();
        fonts.loading.set(true);
        TestBed.overrideProvider(GoogleFontsService, {useValue: fonts});
        TestBed.overrideProvider(GoogleFontLoaderService, {useValue: new SilentFontLoader()});
        const unlisted = contrastTypeAddressFrom({
          ...contrastPage,
          type: {...contrastPage.type, body: {...contrastPage.type.body, family: "Not A Google Face"}}
        });

        const {store, router, pushes, replaces} = await openAt(`/contrast/${unlisted}`);
        expect(store.typeRoles().body.font?.family).toBe("Not A Google Face");

        fonts.succeed();
        await TestBed.inject(ApplicationRef).whenStable();

        expect(store.typeRoles().body.font).toBeNull();
        expect(router.url).toBe(contrastUrlOf(store));
        expect(pushes).not.toHaveBeenCalled();
        expect(replaces).toHaveBeenCalled();
      });


      it("follows the pair taken from the palette, in the same history entry", async () => {
        // A pair typed in by hand, so the palette's pair is a different one.
        const {store, router, pushes, replaces} = await openAt(`/contrast/${contrastAddress}`);
        const before = router.url;

        await dispatch(transferEvents.sendPaletteToContrast());

        expect(router.url).not.toBe(before);
        expect(router.url).toBe(contrastUrlOf(store));
        expect(pushes).not.toHaveBeenCalled();
        expect(replaces).toHaveBeenCalled();
      });


      it("keeps a change on the page on its own address", async () => {
        const {router} = await openAt("/contrast");

        await dispatch(contrastEvents.switchColors());

        expect(router.url.startsWith("/contrast/")).toBe(true);
      });

    });


    describe("a gesture that switches the view", () => {

      it("sends a colour from the Studio to Contrast & Type as a new history entry", async () => {
        const {store, router, pushes} = await openAt("/");

        await dispatch(transferEvents.sendColorToContrast({role: "text", color: chroma("#102030")}));

        expect(router.url).toBe(contrastUrlOf(store));
        expect(pushes).toHaveBeenCalled();
      });

    });


    describe("on a page that is neither view", () => {

      it("stays where it is", async () => {
        const {router} = await openAt("/does-not-exist");

        await dispatch(converterEvents.colorChanged(chroma("#3366cc")));
        await dispatch(contrastEvents.switchColors());

        expect(router.url).toBe("/does-not-exist");
      });

    });

  });

});
