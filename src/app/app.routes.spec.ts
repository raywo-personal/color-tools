import {TestBed} from "@angular/core/testing";
import {provideRouter, Router} from "@angular/router";
import {RouterTestingHarness} from "@angular/router/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {routes} from "./app.routes";
import {Converter} from "@converter/components/converter/converter";
import {ColorPalette} from "@palettes/components/color-palette/color-palette";
import {Contrast} from "@contrast/components/contrast/contrast";
import {NotFound} from "@common/components/not-found/not-found";
import {PALETTE_SLOTS} from "@palettes/models/palette.model";
import chroma from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {contrastIdFromColors} from "@contrast/helper/contrast-id.helper";


describe("app routes", () => {

  beforeEach(() => {
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

    return {component: snapshot.component, title: snapshot.title, url: router.url};
  }


  describe("the wildcard route", () => {

    it("catches an unknown top level path", async () => {
      const {component, url} = await activatedComponentFor("/does-not-exist");

      expect(component).toBe(NotFound);
      expect(url).toBe("/does-not-exist");
    });


    it("catches extra segments below a known route", async () => {
      const {component} = await activatedComponentFor("/palettes/foo/bar");

      expect(component).toBe(NotFound);
    });


    it("catches extra segments below the converter", async () => {
      const {component} = await activatedComponentFor("/convert/extra");

      expect(component).toBe(NotFound);
    });


    it("sets a page title", async () => {
      const {title} = await activatedComponentFor("/does-not-exist");

      expect(title).toBe("ColorTools – Page not found");
    });

  });


  describe("the known routes", () => {

    it("redirects the empty path to the converter", async () => {
      const {component, url} = await activatedComponentFor("/");

      expect(component).toBe(Converter);
      expect(url).toBe("/convert");
    });


    it("still lets the palette guard generate an id", async () => {
      const {component, url} = await activatedComponentFor("/palettes");

      expect(component).toBe(ColorPalette);
      expect(url).toMatch(/^\/palettes\/.+/);
    });


    it("still lets the contrast guard generate an id", async () => {
      const {component, url} = await activatedComponentFor("/contrast");

      expect(component).toBe(Contrast);
      expect(url).toMatch(/^\/contrast\/.+/);
    });


    it("still lets the palette guard replace an invalid id", async () => {
      const {component, url} = await activatedComponentFor("/palettes/garbage");

      expect(component).toBe(ColorPalette);
      expect(url).not.toBe("/palettes/garbage");
    });


    it("does not let the wildcard shadow a valid palette id", async () => {
      const paletteId = TestBed.inject(AppStateStore).currentPalette().id;

      const {component, url} = await activatedComponentFor(`/palettes/${paletteId}`);

      expect(component).toBe(ColorPalette);
      expect(url).toBe(`/palettes/${paletteId}`);
    });


    it("does not let the wildcard shadow a valid contrast id", async () => {
      const contrastColors = TestBed.inject(AppStateStore).contrastColors();
      const contrastId = contrastIdFromColors(contrastColors);

      const {component, url} = await activatedComponentFor(`/contrast/${contrastId}`);

      expect(component).toBe(Contrast);
      expect(url).toBe(`/contrast/${contrastId}`);
    });

  });


  describe("the not found page", () => {

    afterEach(() => {
      document.documentElement.style.removeProperty("--bs-primary");
    });


    it("names the path that was requested", async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl("/does-not-exist");

      expect(harness.routeNativeElement?.textContent).toContain("/does-not-exist");
    });


    it("renames the path when a second unknown path reuses the component", async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl("/does-not-exist");
      await harness.navigateByUrl("/also-does-not-exist");

      expect(harness.routeNativeElement?.textContent).toContain("/also-does-not-exist");
      expect(harness.routeNativeElement?.textContent).not.toContain("/does-not-exist");
    });


    it("links back to the three tools", async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl("/does-not-exist");

      const anchors = harness.routeNativeElement?.querySelectorAll("a") ?? [];
      const hrefs = Array.from(anchors).map(anchor => anchor.getAttribute("href"));

      expect(hrefs).toHaveLength(3);
      expect(hrefs[0]).toBe("/convert");
      expect(hrefs[1]).toMatch(/^\/palettes\/.+/);
      expect(hrefs[2]).toMatch(/^\/contrast\/.+/);
    });


    async function swatchLabels(): Promise<string[]> {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl("/does-not-exist");

      return Array.from(harness.routeNativeElement?.querySelectorAll(".swatch .label") ?? [])
        .map(label => label.textContent?.trim() ?? "");
    }


    it("grows its swatches from the accent the theme declares", async () => {
      // Deliberately not $primary - a hue the fallback cannot produce.
      document.documentElement.style.setProperty("--bs-primary", "hsl(210, 80%, 40%)");

      const filled = (await swatchLabels()).slice(0, PALETTE_SLOTS.length);

      expect(filled.every(label => /^#[0-9A-F]{6}$/.test(label))).toBe(true);
      expect(chroma(filled[0]).hsl()[0]).toBeCloseTo(210, 0);
    });


    it("falls back to $primary when the theme declares no accent", async () => {
      // $primary in src/app/styles/_variables.scss.
      const accentHue = 38.66;

      const filled = (await swatchLabels()).slice(0, PALETTE_SLOTS.length);

      expect(filled.every(label => /^#[0-9A-F]{6}$/.test(label))).toBe(true);
      expect(chroma(filled[0]).hsl()[0]).toBeCloseTo(accentHue, 0);
    });


    it("leaves the swatches beyond the palette empty", async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl("/does-not-exist");

      const chips = harness.routeNativeElement?.querySelectorAll(".chip") ?? [];
      const empty = harness.routeNativeElement?.querySelectorAll(".chip.empty") ?? [];

      expect(chips).toHaveLength(8);
      expect(empty).toHaveLength(8 - PALETTE_SLOTS.length);
    });

  });

});
