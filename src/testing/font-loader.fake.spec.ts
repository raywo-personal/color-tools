import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {Dispatcher} from "@ngrx/signals/events";
import {beforeEach, describe, expect, it} from "vitest";
import {AppStateStore} from "@core/app-state.store";
import {commonEvents} from "@core/common/common.events";
import {provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";
import {provideSilentFontLoader} from "@testing/font-loader.fake";


/** The font links in the head, whichever spec put them there. */
function fontLinks(): NodeListOf<HTMLLinkElement> {
  return document.head.querySelectorAll<HTMLLinkElement>("link[id^='ct-google-font']");
}


describe("provideSilentFontLoader", () => {

  beforeEach(() => {
    // Spec files that share a worker share one happy-dom document, so a link
    // another file left behind would otherwise count against this one. Start
    // from a head without any, and whatever the assertion finds is what this
    // spec's own dispatch added.
    fontLinks().forEach(link => link.remove());
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

    expect(fontLinks()).toHaveLength(0);
  });

});
