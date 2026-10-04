import {provideZonelessChangeDetection} from "@angular/core";
import {TestBed} from "@angular/core/testing";
import {beforeEach, describe, expect, it} from "vitest";
import {AnnouncementService} from "@common/services/announcement.service";
import {fakeLiveAnnouncer, provideFakeLiveAnnouncer} from "@testing/live-announcer.fake";


describe("AnnouncementService", () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideFakeLiveAnnouncer()]
    });
  });


  function setup() {
    return {
      announcements: TestBed.inject(AnnouncementService),
      announcer: fakeLiveAnnouncer()
    };
  }


  it("speaks a gesture's own sentence", () => {
    const {announcements, announcer} = setup();

    announcements.announce("Headline takes Cerulean");

    expect(announcer.announcements)
      .toEqual([{message: "Headline takes Cerulean", politeness: "polite"}]);
  });


  it("speaks a summary where no gesture answered the change", () => {
    // A slider drag and a picker move have no sentence of their own, and the
    // tally is the one thing that covers the whole page.
    const {announcements, announcer} = setup();

    announcements.summarise("On the page: 19 pass.");

    expect(announcer.announcements)
      .toEqual([{message: "On the page: 19 pass.", politeness: "polite"}]);
  });


  it("drops the summary where a gesture has already spoken", () => {
    // Both sentences are about the same change, and `LiveAnnouncer` would
    // delete the first of the two - so the specific one is the one kept, and
    // the summary never reaches the region at all.
    const {announcements, announcer} = setup();

    announcements.announce("Headline takes Cerulean");
    announcements.summarise("On the page: 18 pass, 4 fail.");

    expect(announcer.announcements.map(spoken => spoken.message))
      .toEqual(["Headline takes Cerulean"]);
  });


  it("gives the next change its summary back, even after a gesture said nothing new", () => {
    // The gesture's claim lasts one change. A placement that moves no verdict
    // reaches `summarise(null)`, which is what releases it - without that
    // call the next colour change would lose its tally to a gesture nobody
    // remembers.
    const {announcements, announcer} = setup();

    announcements.announce("Small print takes Slate");
    announcements.summarise(null);
    announcements.summarise("On the page: 17 pass, 5 fail.");

    expect(announcer.announcements.map(spoken => spoken.message))
      .toEqual(["Small print takes Slate", "On the page: 17 pass, 5 fail."]);
  });


  it("keeps speaking summaries while nothing else claims a change", () => {
    const {announcements, announcer} = setup();

    announcements.summarise("On the page: 19 pass.");
    announcements.summarise(null);
    announcements.summarise("On the page: 18 pass, 1 fail.");

    expect(announcer.announcements).toHaveLength(2);
  });

});
