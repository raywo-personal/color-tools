import {TestBed} from "@angular/core/testing";
import {provideZonelessChangeDetection} from "@angular/core";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import {afterEach, beforeEach, describe, expect, it, MockInstance, vi} from "vitest";
import chroma from "chroma-js";
import {colorName} from "@common/helpers/color-name.helper";
import {CopyService} from "./copy.service";


describe("CopyService", () => {

  let writeText: MockInstance<(text: string) => Promise<void>>;
  let announce: MockInstance<LiveAnnouncer["announce"]>;


  beforeEach(() => {
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });

    writeText = vi.spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);

    announce = vi.spyOn(TestBed.inject(LiveAnnouncer), "announce")
      .mockResolvedValue(undefined);
  });


  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });


  function service(): CopyService {
    return TestBed.inject(CopyService);
  }


  describe("copyColor", () => {

    it("writes the color to the clipboard", async () => {
      await service().copyColor(chroma("#3366CC"));

      expect(writeText).toHaveBeenCalledWith("#3366CC");
    });


    it("writes the text a slice hands it, so a conversion row can copy its own format", async () => {
      await service().copyColor(chroma("#3366CC"), "rgb(51, 102, 204)");

      expect(writeText).toHaveBeenCalledWith("rgb(51, 102, 204)");
    });


    it("confirms with the value that landed on the clipboard", async () => {
      await service().copyColor(chroma("#3366CC"));

      expect(service().confirmation()).toBe("Copied #3366CC");
    });


    it("announces the color's name, because a hex code is spelled out one character at a time", async () => {
      const color = chroma("#3366CC");

      await service().copyColor(color);

      expect(announce)
        .toHaveBeenCalledWith(`Copied ${colorName(color)}`, "polite");
      expect(announce.mock.calls[0][0]).not.toMatch(/#[0-9A-F]{6}/i);
    });


    it("announces the color even when the slice copies another format", async () => {
      const color = chroma("#3366CC");

      await service().copyColor(color, "rgb(51, 102, 204)");

      expect(announce)
        .toHaveBeenCalledWith(`Copied ${colorName(color)}`, "polite");
    });

  });


  describe("copyText", () => {

    it("writes the whole text but confirms and announces only its label", async () => {
      const css = ":root {\n  --color-0: #3366CC;\n}";

      await service().copyText(css, "the CSS variables");

      expect(writeText).toHaveBeenCalledWith(css);
      expect(service().confirmation()).toBe("Copied the CSS variables");
      expect(announce)
        .toHaveBeenCalledWith("Copied the CSS variables", "polite");
    });

  });


  describe("a write that fails", () => {

    it("says so when the clipboard rejects, rather than leaving the visitor believing it worked", async () => {
      writeText.mockRejectedValue(new Error("NotAllowedError"));

      await service().copyColor(chroma("#3366CC"));

      expect(service().confirmation()).toBe("Could not copy #3366CC");
    });


    it("announces the failure assertively, because it interrupts what the visitor was doing", async () => {
      writeText.mockRejectedValue(new Error("NotAllowedError"));
      const color = chroma("#3366CC");

      await service().copyColor(color);

      expect(announce)
        .toHaveBeenCalledWith(`Could not copy ${colorName(color)}`, "assertive");
    });


    it("says so outside a secure context, where there is no clipboard to reject", async () => {
      // `navigator.clipboard` is undefined on http, so this case never reaches
      // the catch and needs a guard of its own.
      vi.spyOn(navigator, "clipboard", "get").mockReturnValue(undefined!);

      await service().copyColor(chroma("#3366CC"));

      expect(service().confirmation()).toBe("Could not copy #3366CC");
      expect(announce).toHaveBeenCalledWith(expect.stringMatching(/^Could not copy /), "assertive");
    });

  });


  describe("the confirmation", () => {

    it("clears itself, so a stale toast does not confirm the next copy", async () => {
      await service().copyColor(chroma("#3366CC"));

      vi.advanceTimersByTime(1400);

      expect(service().confirmation()).toBeNull();
    });


    it("starts its time over on a second copy", async () => {
      await service().copyColor(chroma("#3366CC"));
      vi.advanceTimersByTime(1000);

      await service().copyColor(chroma("#CC3366"));
      vi.advanceTimersByTime(1000);

      expect(service().confirmation()).toBe("Copied #CC3366");
    });

  });

});
