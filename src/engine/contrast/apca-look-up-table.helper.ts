import {APCALookupTable} from "@engine/contrast/apca-lookup-table.model";


/**
 * The APCA font-use lookup table: the Lc a size and weight has to reach.
 *
 * This is the `byFontSize` array of the APCA font lookup tables, Public Beta
 * 0.1.7 (G), copyright Myndex Research and Andrew Somers. The machine-readable
 * original is `data/LUT-GseriesMay28-2022.js` in `Myndex/apca-w3`, and every
 * cell here matches it. Take a correction and a footnote from that file, never
 * from a rendered table or a screenshot of one - the printable tables carry
 * the same numbers, but state as a symbol what the original states as a value.
 *
 * `null` is not a gap to be filled. The original writes those cells as 999,
 * "prohibited - too low contrast", or 777, "non text at this minimum weight
 * stroke", and neither leaves an Lc that makes the pair readable as text, so
 * there is nothing to look up. Its 10px row is 999 at every weight, which is
 * why no such row is here.
 *
 * **The original measures against Barlow.** Its rows are px of that face, so
 * a narrower one with a smaller x-height is rated more leniently here than it
 * has earned.
 *
 * **The original's body-text surcharge is not applied.** Its footnote asks
 * for Lc 15 on top of any requirement under Lc 70 where the text is a column
 * of body copy, and holds spot text - a copyright line, a placeholder - to
 * the plain figure. Every requirement here is the plain figure, so body copy
 * is rated by the more lenient of the two the original allows.
 *
 * The Lc side of the pair comes from `chroma.contrastAPCA()`. Replacing that
 * function means checking that it still implements the generation of the
 * algorithm this table was drawn for.
 */
export const apcaLookup: APCALookupTable = {
  "12px": {
    "100": {contrast: null},
    "200": {contrast: null},
    "300": {contrast: null},
    "400": {contrast: null},
    "500": {contrast: null},
    "600": {contrast: null},
    "700": {contrast: null},
    "800": {contrast: null},
    "900": {contrast: null}
  },
  "14px": {
    "100": {contrast: null},
    "200": {contrast: null},
    "300": {contrast: null},
    "400": {contrast: 100},
    "500": {contrast: 100},
    "600": {contrast: 90},
    "700": {contrast: 75},
    "800": {contrast: null},
    "900": {contrast: null}
  },
  "15px": {
    "100": {contrast: null},
    "200": {contrast: null},
    "300": {contrast: null},
    "400": {contrast: 100},
    "500": {contrast: 90},
    "600": {contrast: 75},
    "700": {contrast: 70},
    "800": {contrast: null},
    "900": {contrast: null}
  },
  "16px": {
    "100": {contrast: null},
    "200": {contrast: null},
    "300": {contrast: null},
    "400": {contrast: 90},
    "500": {contrast: 75},
    "600": {contrast: 70},
    "700": {contrast: 60},
    "800": {contrast: 60},
    "900": {contrast: null}
  },
  "18px": {
    "100": {contrast: null},
    "200": {contrast: null},
    "300": {contrast: 100},
    "400": {contrast: 75},
    "500": {contrast: 70},
    "600": {contrast: 60},
    "700": {contrast: 55},
    "800": {contrast: 55},
    "900": {contrast: 55}
  },
  "21px": {
    "100": {contrast: null},
    "200": {contrast: null},
    "300": {contrast: 90},
    "400": {contrast: 70},
    "500": {contrast: 60},
    "600": {contrast: 55},
    "700": {contrast: 50},
    "800": {contrast: 50},
    "900": {contrast: 50}
  },
  "24px": {
    "100": {contrast: null},
    "200": {contrast: null},
    "300": {contrast: 75},
    "400": {contrast: 60},
    "500": {contrast: 55},
    "600": {contrast: 50},
    "700": {contrast: 45},
    "800": {contrast: 45},
    "900": {contrast: 45}
  },
  "28px": {
    "100": {contrast: null},
    "200": {contrast: 100},
    "300": {contrast: 70},
    "400": {contrast: 55},
    "500": {contrast: 50},
    "600": {contrast: 45},
    "700": {contrast: 43},
    "800": {contrast: 43},
    "900": {contrast: 43}
  },
  "32px": {
    "100": {contrast: null},
    "200": {contrast: 90},
    "300": {contrast: 65},
    "400": {contrast: 50},
    "500": {contrast: 45},
    "600": {contrast: 43},
    "700": {contrast: 40},
    "800": {contrast: 40},
    "900": {contrast: 40}
  },
  "36px": {
    "100": {contrast: null},
    "200": {contrast: 75},
    "300": {contrast: 60},
    "400": {contrast: 45},
    "500": {contrast: 43},
    "600": {contrast: 40},
    "700": {contrast: 38},
    "800": {contrast: 38},
    "900": {contrast: 38}
  },
  "42px": {
    "100": {contrast: 100},
    "200": {contrast: 70},
    "300": {contrast: 55},
    "400": {contrast: 43},
    "500": {contrast: 40},
    "600": {contrast: 38},
    "700": {contrast: 35},
    "800": {contrast: 35},
    "900": {contrast: 35}
  },
  "48px": {
    "100": {contrast: 90},
    "200": {contrast: 60},
    "300": {contrast: 50},
    "400": {contrast: 40},
    "500": {contrast: 38},
    "600": {contrast: 35},
    "700": {contrast: 33},
    "800": {contrast: 33},
    "900": {contrast: 33}
  },
  "60px": {
    "100": {contrast: 75},
    "200": {contrast: 55},
    "300": {contrast: 45},
    "400": {contrast: 38},
    "500": {contrast: 35},
    "600": {contrast: 33},
    "700": {contrast: 30},
    "800": {contrast: 30},
    "900": {contrast: 30}
  },
  "72px": {
    "100": {contrast: 60},
    "200": {contrast: 50},
    "300": {contrast: 40},
    "400": {contrast: 35},
    "500": {contrast: 33},
    "600": {contrast: 30},
    "700": {contrast: 30},
    "800": {contrast: 30},
    "900": {contrast: 30}
  },
  "96px": {
    "100": {contrast: 50},
    "200": {contrast: 45},
    "300": {contrast: 35},
    "400": {contrast: 33},
    "500": {contrast: 30},
    "600": {contrast: 30},
    "700": {contrast: 30},
    "800": {contrast: 30},
    "900": {contrast: 30}
  }
};
