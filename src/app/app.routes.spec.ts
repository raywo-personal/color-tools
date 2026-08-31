import {TestBed} from "@angular/core/testing";
import {provideRouter, Router} from "@angular/router";
import {provideZonelessChangeDetection} from "@angular/core";
import {beforeEach, describe, expect, it} from "vitest";
import {routes} from "./app.routes";
import {Studio} from "@studio/components/studio/studio";
import {ContrastType} from "@contrast-type/components/contrast-type/contrast-type";
import {NotFound} from "@common/components/not-found/not-found";


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

    return {component: snapshot.component, title: snapshot.title, url: router.url, data: snapshot.data};
  }


  describe("the two views", () => {

    it("puts the studio on the start page", async () => {
      const {component, url} = await activatedComponentFor("/");

      expect(component).toBe(Studio);
      expect(url).toBe("/");
    });


    it("gives contrast & type a path of its own", async () => {
      const {component, url} = await activatedComponentFor("/contrast");

      expect(component).toBe(ContrastType);
      expect(url).toBe("/contrast");
    });


    it("titles both views", async () => {
      const studio = await activatedComponentFor("/");
      const contrast = await activatedComponentFor("/contrast");

      expect(studio.title).toBe("ColorTools – Studio");
      expect(contrast.title).toBe("ColorTools – Contrast & Type");
    });

  });


  describe("the wildcard route", () => {

    it("catches an unknown top level path", async () => {
      const {component, url} = await activatedComponentFor("/does-not-exist");

      expect(component).toBe(NotFound);
      expect(url).toBe("/does-not-exist");
    });


    it("catches extra segments below a known route", async () => {
      const {component} = await activatedComponentFor("/contrast/extra");

      expect(component).toBe(NotFound);
    });


    it("catches a v1 url until the shareable ids come back", async () => {
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
