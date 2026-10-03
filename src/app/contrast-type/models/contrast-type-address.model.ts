import chroma, {Color} from "chroma-js";
import {Palette} from "@engine/palette/palette.model";
import {isRestorablePaletteSegment, paletteFromSegment, paletteSegmentFrom} from "@engine/palette/palette-segment.helper";
import {fontSizeRangeFor, TYPE_ROLES, TypeRole} from "@engine/contrast/type-role.model";
import {FONT_WEIGHT_RANGE, LINE_HEIGHT_RANGE, TypeSettingRange, TypeSettings} from "@engine/contrast/type-settings.model";
import {base62LengthFor, BitField, packBits, unpackBits} from "@engine/helpers/bit-fields.helper";
import {base62ToBigInt, bigIntToBase62} from "@engine/helpers/base62.helper";
import {BASE62_ID} from "@engine/helpers/validate-string-id.helper";
import {CHIP_SOURCES} from "@contrast-type/models/chip-source.model";
import {ElementPlacements, PlacedSources, SAMPLE_ELEMENTS, SAMPLE_PLACEMENTS} from "@contrast-type/models/sample-page.model";


/**
 * One role's type as the address carries it: the family by name, or null for
 * the app's own type, and the size, weight and leading it is set at.
 *
 * A name and not a `SelectedFont`: the category and the weights a family
 * ships are the Google catalogue's, and the address does not repeat them.
 */
export interface AddressedType {

  readonly family: string | null;
  readonly settings: TypeSettings;

}


/**
 * Everything the Contrast & Type address carries: what the receiver needs to
 * see the page the sender saw and read the same verdicts.
 *
 * The palette travels with the pair because a placement is a palette slot and
 * never a hex - `ElementPlacements` says why - and its seed and starting
 * colours travel with it so the receiver can keep working in the Studio.
 */
export interface ContrastTypePage {

  readonly palette: Palette;
  readonly seed: number;
  readonly text: Color;
  readonly background: Color;
  readonly type: Readonly<Record<TypeRole, AddressedType>>;
  readonly placements: ElementPlacements;

}


/**
 * Separates the three segments and appears nowhere else: the encoded
 * segments spell `0-9A-Za-z` alone, and the family names are written through
 * `encodeURIComponent`, which turns a `/` into `%2F`.
 */
export const ADDRESS_SEPARATOR = "/";

/**
 * Separates the four family names. **Unambiguous only because every name goes
 * through `encodeURIComponent`**, which turns a `,` into `%2C`. That is part of
 * the format: a name written without it splits into a field too many.
 */
const FAMILY_SEPARATOR = ",";

/** How many placements a page can hold: one per side of every element. */
export const MAX_PLACEMENTS = SAMPLE_ELEMENTS.length * SAMPLE_PLACEMENTS.length;


/*
 * The field widths are the format and stay literal. Derived from the lists
 * they index, a 33rd element or a sixth palette slot would widen a field and
 * every address written before it would decode from a shifted window.
 * `contrast-type-address.model.spec.ts` checks that each list still fits.
 */
const COLOR_BITS = 24;
/** 32 elements. `SAMPLE_ELEMENTS` growing past that needs a new format. */
export const ELEMENT_BITS = 5;
const SIDE_BITS = 1;
/** 8 sources: five slots and the pair's two use seven. */
export const SOURCE_BITS = 3;
const WEIGHT_BITS = 3;
const LEADING_BITS = 5;

/**
 * A display line moves over 24-96px and the other roles over 11-34px - see
 * `fontSizeRangeFor()` - so the display role takes the wider field.
 */
const SIZE_BITS: Readonly<Record<TypeRole, number>> = {display: 7, body: 5, mono: 5, ui: 5};


/** One axis of a role's type, as the view segment writes it. */
interface TypeAxis {

  readonly name: keyof TypeSettings;
  readonly range: TypeSettingRange;
  readonly bits: number;

}


/** The three axes of a role, in the order the view segment writes them. */
export function typeAxesOf(role: TypeRole): readonly TypeAxis[] {
  return [
    {name: "fontSize", range: fontSizeRangeFor(role), bits: SIZE_BITS[role]},
    {name: "fontWeight", range: FONT_WEIGHT_RANGE, bits: WEIGHT_BITS},
    {name: "lineHeight", range: LINE_HEIGHT_RANGE, bits: LEADING_BITS}
  ];
}


/** How many values an axis can stand on. */
export function stepCountOf(range: TypeSettingRange): number {
  return Math.round((range.max - range.min) / range.step) + 1;
}


/**
 * Writes the address of a page: the palette segment, the view segment and
 * the typefaces, separated by `ADDRESS_SEPARATOR`.
 *
 * @param {ContrastTypePage} page - The page to write.
 * @return {string} The address.
 * @throws {Error} If a value is one the controls could not have produced: a
 *                 seed out of range, a type setting off its grid, or an
 *                 empty family name.
 */
export function contrastTypeAddressFrom(page: ContrastTypePage): string {
  return [
    paletteSegmentFrom(page.palette, page.seed),
    viewSegmentFrom(page),
    facesSegmentFrom(page.type)
  ].join(ADDRESS_SEPARATOR);
}


/**
 * Whether `contrastTypePageFromAddress()` can read the address.
 *
 * **Every field is checked against its valid range, not against its width.**
 * There is no check digit; the narrow ranges are the integrity check, and a
 * better one. Base62 does not preserve positions, so one corrupted character
 * changes every field behind it, which is what the ranges catch.
 *
 * @param {string} address - The address to check.
 * @return {boolean} True if the address reads without throwing.
 */
export function isRestorableContrastTypeAddress(address: string): boolean {
  return decoded(address) !== null;
}


/**
 * Reads a page back from its address.
 *
 * @param {string} address - The address to read.
 * @return {ContrastTypePage} The page the address was written from.
 * @throws {Error} If the address is not restorable - see
 *                 `isRestorableContrastTypeAddress()`.
 */
export function contrastTypePageFromAddress(address: string): ContrastTypePage {
  const page = decoded(address);

  if (!page) throw new Error("Contrast & Type address is not restorable");

  return page;
}


function decoded(address: string): ContrastTypePage | null {
  const segments = address.split(ADDRESS_SEPARATOR);

  if (segments.length !== 3) return null;

  const [paletteSegment, viewSegment, facesSegment] = segments;

  if (!isRestorablePaletteSegment(paletteSegment)) return null;

  const view = viewFromSegment(viewSegment);
  const families = familiesFromSegment(facesSegment);

  if (!view || !families) return null;

  const {palette, seed} = paletteFromSegment(paletteSegment);
  const type = Object.fromEntries(TYPE_ROLES.map(role => [
    role,
    {family: families[role], settings: view.settings[role]}
  ])) as Record<TypeRole, AddressedType>;

  return {palette, seed, text: view.text, background: view.background, type, placements: view.placements};
}


/*
 * The view segment: the number of placements in one leading character, then
 * the pair, the type per role and the placements as one packed value.
 *
 * The count comes first so the segment's length is known before it is read.
 * Base62 with leading zeros is only unambiguous at a known length, so a
 * segment's length always follows from a fixed prefix, never from itself.
 */


interface View {

  readonly text: Color;
  readonly background: Color;
  readonly settings: Readonly<Record<TypeRole, TypeSettings>>;
  readonly placements: ElementPlacements;

}


/** A placement as the view segment writes it: three indices. */
interface IndexedPlacement {

  readonly element: number;
  readonly side: number;
  readonly source: number;

}


function viewSegmentFrom(page: ContrastTypePage): string {
  const placements = indexedPlacements(page.placements);
  const fields: BitField[] = [
    {value: rgbValueOf(page.text), bits: COLOR_BITS},
    {value: rgbValueOf(page.background), bits: COLOR_BITS},
    ...TYPE_ROLES.flatMap(role => typeAxesOf(role).map(axis => ({
      value: gridIndexOrThrow(page.type[role].settings[axis.name], axis.range),
      bits: axis.bits
    }))),
    ...placements.flatMap(placement => [
      {value: placement.element, bits: ELEMENT_BITS},
      {value: placement.side, bits: SIDE_BITS},
      {value: placement.source, bits: SOURCE_BITS}
    ])
  ];

  const length = base62LengthFor(totalBits(viewWidths(placements.length)));

  return bigIntToBase62(BigInt(placements.length), 1) + bigIntToBase62(packBits(fields), length);
}


function viewFromSegment(segment: string): View | null {
  if (!BASE62_ID.test(segment)) return null;

  const count = Number(base62ToBigInt(segment[0]));

  if (count > MAX_PLACEMENTS) return null;

  const widths = viewWidths(count);
  const bits = totalBits(widths);

  if (segment.length !== 1 + base62LengthFor(bits)) return null;

  const packed = base62ToBigInt(segment.substring(1));

  if (packed >= 1n << BigInt(bits)) return null;

  const values = unpackBits(packed, widths);
  let next = 0;
  const read = () => values[next++];

  const text = colorOfValue(read());
  const background = colorOfValue(read());

  const settings: Partial<Record<TypeRole, TypeSettings>> = {};

  for (const role of TYPE_ROLES) {
    const axes: Partial<Record<keyof TypeSettings, number>> = {};

    for (const axis of typeAxesOf(role)) {
      const index = read();

      if (index >= stepCountOf(axis.range)) return null;

      axes[axis.name] = gridValueOf(index, axis.range);
    }

    settings[role] = axes as TypeSettings;
  }

  const placements: Record<string, PlacedSources> = {};
  // Written in page order, ink before ground, so each placement stands after
  // the one before it. A placement out of that order or twice over is not one
  // the encoder writes.
  let previous = -1;

  for (let i = 0; i < count; i++) {
    const placement = {element: read(), side: read(), source: read()};

    if (placement.element >= SAMPLE_ELEMENTS.length || placement.source >= CHIP_SOURCES.length) return null;

    const position = placement.element * SAMPLE_PLACEMENTS.length + placement.side;

    if (position <= previous) return null;

    previous = position;

    const key = SAMPLE_ELEMENTS[placement.element].key;

    placements[key] = {...placements[key], [SAMPLE_PLACEMENTS[placement.side]]: CHIP_SOURCES[placement.source]};
  }

  return {text, background, settings: settings as Record<TypeRole, TypeSettings>, placements};
}


/** The widths of a view segment holding `count` placements, in reading order. */
function viewWidths(count: number): number[] {
  return [
    COLOR_BITS,
    COLOR_BITS,
    ...TYPE_ROLES.flatMap(role => typeAxesOf(role).map(axis => axis.bits)),
    ...Array.from({length: count}, () => [ELEMENT_BITS, SIDE_BITS, SOURCE_BITS]).flat()
  ];
}


function totalBits(widths: readonly number[]): number {
  return widths.reduce((sum, bits) => sum + bits, 0);
}


/**
 * The placements in page order, ink before ground - one order for every
 * address, so the same page always writes the same address.
 */
function indexedPlacements(placements: ElementPlacements): IndexedPlacement[] {
  return SAMPLE_ELEMENTS.flatMap((element, elementIndex) =>
    SAMPLE_PLACEMENTS.flatMap((side, sideIndex) => {
      const source = placements[element.key]?.[side];

      return source ? [{element: elementIndex, side: sideIndex, source: CHIP_SOURCES.indexOf(source)}] : [];
    })
  );
}


function rgbValueOf(color: Color): number {
  const [red, green, blue] = color.rgb();

  return (red << 16) | (green << 8) | blue;
}


function colorOfValue(value: number): Color {
  return chroma.rgb((value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff);
}


/**
 * The step a value stands on, counted from the range's minimum. Compared with
 * a tolerance, because `1 + 7 * 0.05` is not exactly 1.35 in binary floating
 * point and the state holds the rounded value.
 */
function gridIndexOrThrow(value: number, range: TypeSettingRange): number {
  const steps = (value - range.min) / range.step;
  const index = Math.round(steps);

  if (Math.abs(steps - index) > 1e-9 || index < 0 || index >= stepCountOf(range)) {
    throw new Error(`${value} is not on the grid ${range.min}..${range.max} by ${range.step}`);
  }

  return index;
}


/** The value of a step, rounded to the step's own precision. */
function gridValueOf(index: number, range: TypeSettingRange): number {
  const decimals = String(range.step).split(".")[1]?.length ?? 0;

  return Number((range.min + index * range.step).toFixed(decimals));
}


/*
 * The typefaces: one Google family name per role in plain text, an empty
 * field for the app's own type. A name and not a catalogue index - the
 * catalogue changes, and an index written today names another family
 * tomorrow.
 */


function facesSegmentFrom(type: Readonly<Record<TypeRole, AddressedType>>): string {
  return TYPE_ROLES.map(role => {
    const family = type[role].family;

    if (family === "") throw new Error(`The ${role} role names an empty family`);

    return encodeURIComponent(family ?? "");
  }).join(FAMILY_SEPARATOR);
}


/** Control characters have no place in a family name a CSS string carries. */
function hasControlCharacter(text: string): boolean {
  return [...text].some(character => {
    const code = character.charCodeAt(0);

    return code < 0x20 || code === 0x7f;
  });
}


function familiesFromSegment(segment: string): Record<TypeRole, string | null> | null {
  const fields = segment.split(FAMILY_SEPARATOR);

  if (fields.length !== TYPE_ROLES.length) return null;

  const families: Partial<Record<TypeRole, string | null>> = {};

  for (const [index, role] of TYPE_ROLES.entries()) {
    const field = fields[index];

    if (field === "") {
      families[role] = null;
      continue;
    }

    let family: string;

    try {
      family = decodeURIComponent(field);
    } catch {
      return null;
    }

    if (family.trim() === "" || hasControlCharacter(family)) return null;

    families[role] = family;
  }

  return families as Record<TypeRole, string | null>;
}
