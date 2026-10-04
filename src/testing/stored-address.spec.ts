import {afterEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {storedPage, storePage} from "./stored-address";
import {LOCAL_STORAGE_KEY} from "@common/models/local-storage.model";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {DEFAULT_TYPE_SETTINGS_BY_ROLE} from "@engine/contrast/type-role.model";


describe("stored address", () => {

  afterEach(() => localStorage.clear());


  it("reads back the page it stored", () => {
    const palette = generatePaletteFrom(chroma("#3366cc"), "triadic", 5);

    storePage({
      palette,
      seed: 5,
      text: chroma("#111111"),
      background: chroma("#eeeeee"),
      type: {
        display: {family: null, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.display},
        body: {family: "Roboto", settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.body},
        mono: {family: null, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.mono},
        ui: {family: null, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.ui}
      },
      placements: {lead: {ground: "color1"}}
    }, {colorTheme: "light"});

    const page = storedPage();

    expect(page?.palette.id).toBe(palette.id);
    expect(page?.type.body.family).toBe("Roboto");
    expect(page?.placements).toEqual({lead: {ground: "color1"}});
    expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) ?? "{}").colorTheme).toBe("light");
  });


  it("reports nothing where no address is stored", () => {
    expect(storedPage()).toBeNull();

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({address: "not-an-address"}));

    expect(storedPage()).toBeNull();
  });

});
