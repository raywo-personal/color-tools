import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import {AppStateStore} from "@core/app-state.store";
import {commonEvents} from "@core/common/common.events";
import {provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {provideSilentFontLoader} from "@testing/font-loader.fake";


describe("provideSilentFontLoader", () => {

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFakeLiveAnnouncer(),
        provideSilentFontLoader()
      ]
    });
  });


  it("keeps a picked face out of the document head", () => {
    // The real loader would append a stylesheet link that happy-dom fetches.
    TestBed.inject(AppStateStore);

    TestBed.inject(Dispatcher).dispatch(commonEvents.fontSelected({
      role: "body",
      font: {family: "Lobster", category: "display", variant: "regular", weights: [400]}
    }));

    expect(document.head.querySelectorAll("link[id^='ct-google-font']")).toHaveLength(0);
  });

});
