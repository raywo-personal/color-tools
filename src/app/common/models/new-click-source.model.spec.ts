import {describe, expect, it} from "vitest";
import {routePathToSource} from "@common/models/new-click-source.model";


describe("routePathToSource", () => {

  it("recognises the feature routes", () => {
    expect(routePathToSource("/convert")).toBe("convert");
    expect(routePathToSource("/palettes/0EEyV2")).toBe("palettes");
    expect(routePathToSource("/contrast/1HvWWobCq")).toBe("contrast");
  });


  it("falls back to the converter for an unknown path", () => {
    expect(routePathToSource("/does-not-exist")).toBe("convert");
    expect(routePathToSource("/does-not-exist/deeper")).toBe("convert");
  });


  it("falls back to the converter for the root and for junk", () => {
    expect(routePathToSource("/")).toBe("convert");
    expect(routePathToSource("")).toBe("convert");
  });

});
