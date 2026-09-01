import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import {describe, expect, it} from "vitest";
import {
  FakeLiveAnnouncer,
  fakeLiveAnnouncer,
  provideFakeLiveAnnouncer
} from "@testing/live-announcer.fake";


// The fake stands between every announcement rule and its test: if it recorded
// nothing, or recorded the wrong politeness, each of those tests would pass on
// a screen that says nothing.
describe("FakeLiveAnnouncer", () => {

  it("records what was said and how urgently", async () => {
    const announcer = new FakeLiveAnnouncer();

    await announcer.announce("Copied Denim", "assertive");

    expect(announcer.last).toEqual({message: "Copied Denim", politeness: "assertive"});
  });


  it("records a caller that omits the politeness as polite, which is what would be spoken", async () => {
    const announcer = new FakeLiveAnnouncer();

    await announcer.announce("New palette: Denim");

    expect(announcer.last?.politeness).toBe("polite");
  });


  it("records a duration as the politeness of nothing, because it is not one", async () => {
    const announcer = new FakeLiveAnnouncer();

    await announcer.announce("New palette: Denim", 1400);

    expect(announcer.last?.politeness).toBe("polite");
  });


  it("keeps every announcement, oldest first", async () => {
    const announcer = new FakeLiveAnnouncer();

    await announcer.announce("First", "polite");
    await announcer.announce("Second", "polite");

    expect(announcer.announcements.map(spoken => spoken.message))
      .toEqual(["First", "Second"]);
    expect(announcer.last?.message).toBe("Second");
  });


  it("says nothing before anything was announced", () => {
    expect(new FakeLiveAnnouncer().last).toBeUndefined();
  });


  it("is what the TestBed hands out once it is provided", async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideFakeLiveAnnouncer()]
    });

    await TestBed.inject(LiveAnnouncer).announce("Copied Denim", "polite");

    expect(fakeLiveAnnouncer().last?.message).toBe("Copied Denim");
  });


  it("names the missing provider rather than recording into the real service", () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });

    expect(() => fakeLiveAnnouncer()).toThrowError(/provideFakeLiveAnnouncer/);
  });

});
