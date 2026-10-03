import {ApplicationRef} from "@angular/core";
import {bootstrapApplication} from "@angular/platform-browser";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {appConfig} from "./app.config";
import {App} from "./app";
import {Dispatcher} from "@ngrx/signals/events";
import chroma from "chroma-js";
import {converterEvents} from "@core/converter/converter.events";


describe("app config", () => {

  let app: ApplicationRef | undefined;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = "<ct-root></ct-root>";
  });


  afterEach(() => {
    app?.destroy();
    app = undefined;
    history.replaceState(null, "", "/");
    vi.restoreAllMocks();
  });


  /**
   * The app as `main.ts` starts it. The router's scrolling starts with the
   * bootstrap and not with the router, so neither `TestBed` nor
   * `RouterTestingHarness` would ever scroll.
   */
  async function boot(url: string) {
    history.replaceState(null, "", url);
    app = await bootstrapApplication(App, appConfig);
    await app.whenStable();
  }


  /** The router scrolls a frame after the navigation has ended. */
  function nextFrame(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 50));
  }


  describe("a link into the Studio", () => {

    it("lands on the section it names and moves focus there", async () => {
      // The bare path is redirected to the palette's address, so this also
      // pins that the fragment survives the redirect.
      await boot("/#palette");

      await vi.waitFor(() => expect(document.activeElement?.id).toBe("palette"));
    });


    it("leaves the page where it is when it names no section", async () => {
      const scrollTo = vi.spyOn(window, "scrollTo");

      await boot("/");
      await nextFrame();

      expect(scrollTo).not.toHaveBeenCalled();
    });


    it("keeps focus on the control the visitor used when the address follows a change", async () => {
      await boot("/#palette");
      await vi.waitFor(() => expect(document.activeElement?.id).toBe("palette"));

      const control = document.querySelector<HTMLElement>("ct-studio button");
      control?.focus();
      const before = location.pathname;

      app?.injector.get(Dispatcher).dispatch(converterEvents.colorChanged(chroma("#3366cc")));
      await app?.whenStable();
      await nextFrame();

      expect(location.pathname).not.toBe(before);
      expect(document.activeElement).toBe(control);
    });

  });

});
