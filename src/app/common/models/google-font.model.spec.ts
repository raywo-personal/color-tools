import {describe, expect, it} from "vitest";
import {fontWeightsOf, getRegularFont, SelectedFont, weightStopsFor} from "@common/models/google-font.model";
import {WEIGHT_STOPS} from "@engine/contrast/type-settings.model";
import {googleFont} from "@testing/google-fonts.fake";


/** A selection as the picker builds one. */
function selection(weights: number[]): SelectedFont {
  return {family: "Fake", category: "sans-serif", variant: "regular", weights};
}


describe("fontWeightsOf", () => {

  it("reads the API's own spelling of 400", () => {
    expect(fontWeightsOf(googleFont("Fake", "serif", ["regular"]))).toEqual([400]);
  });


  it("leaves the italics out, because they are the same weights in another style", () => {
    const font = googleFont("Fake", "serif", ["300", "300italic", "regular", "italic", "700"]);

    expect(fontWeightsOf(font)).toEqual([300, 400, 700]);
  });


  it("sorts ascending, whatever order the API listed them in", () => {
    const font = googleFont("Fake", "serif", ["700", "100", "regular"]);

    expect(fontWeightsOf(font)).toEqual([100, 400, 700]);
  });


  it("drops a variant that is not a weight at all", () => {
    const font = googleFont("Fake", "serif", ["regular", "nonsense"]);

    expect(fontWeightsOf(font)).toEqual([400]);
  });

});


describe("getRegularFont", () => {

  it("carries the family's weights into the selection", () => {
    // The loader asks Google for exactly these, and the WEIGHT slider stands
    // on them.
    const font = googleFont("Fake", "serif", ["300", "regular", "700"]);

    expect(getRegularFont(font).weights).toEqual([300, 400, 700]);
  });

});


describe("weightStopsFor", () => {

  it("offers the whole grid while nothing is chosen", () => {
    expect(weightStopsFor(null)).toEqual(WEIGHT_STOPS);
  });


  it("narrows the grid to what the family ships", () => {
    expect(weightStopsFor(selection([100, 300, 400, 700, 900]))).toEqual([300, 400, 700]);
  });


  it("offers the whole grid for a selection stored before the weights existed", () => {
    expect(weightStopsFor(selection([]))).toEqual(WEIGHT_STOPS);
  });


  it("offers the whole grid for a family with nothing inside the range", () => {
    // A slider with no stop at all would be worse than one whose ends the
    // browser has to synthesise.
    expect(weightStopsFor(selection([100, 200, 900]))).toEqual(WEIGHT_STOPS);
  });

});
