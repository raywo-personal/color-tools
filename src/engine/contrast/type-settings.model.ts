import {FONT_WEIGHTS} from "@engine/contrast/apca-lookup-table.model";


/**
 * The type the visitor is designing for: what the website preview is set in,
 * and what the APCA rating answers about.
 *
 * **The size is a pixel value and stays one.** APCA is defined on pixel sizes,
 * and `apcaLookup` is keyed by them - the preview is the thing being measured
 * rather than app chrome, so the rule that turns a length into a rem does not
 * reach it.
 */
export interface TypeSettings {

  readonly fontSize: number;
  readonly fontWeight: number;
  readonly lineHeight: number;

}


/** The range a control covers, and the step it moves in. */
export interface TypeSettingRange {

  readonly min: number;
  readonly max: number;
  readonly step: number;

}


export const FONT_SIZE_RANGE: TypeSettingRange = {min: 11, max: 34, step: 1};

/**
 * The step is 100, not 1: `apcaLookup` is keyed by the nine values of
 * `FONT_WEIGHTS`, so a weight of 437 has no row to be rated against.
 */
export const FONT_WEIGHT_RANGE: TypeSettingRange = {min: 300, max: 700, step: 100};

/** 0.05, so every stop is a value `toFixed(2)` writes without rounding. */
export const LINE_HEIGHT_RANGE: TypeSettingRange = {min: 1.2, max: 2, step: 0.05};

/**
 * What the preview opens on, and what a value outside the ranges falls back
 * to. Here rather than in `initialState`, which takes it from here, so the
 * default sits beside the ranges it has to fit into.
 */
export const DEFAULT_TYPE_SETTINGS: TypeSettings = {
  fontSize: 18,
  fontWeight: 400,
  lineHeight: 1.6
};

/**
 * The weights the slider can stand on, taken from the lookup table rather than
 * from the step: the grid the control moves on is the set of rows the rating
 * has, and stating it this way keeps the two from drifting apart.
 */
const WEIGHT_STOPS: readonly number[] = FONT_WEIGHTS
  .map(Number)
  .filter(weight => weight >= FONT_WEIGHT_RANGE.min && weight <= FONT_WEIGHT_RANGE.max);


/**
 * The settings as the app is willing to hold them.
 *
 * A value can arrive from outside the controls - localStorage is editable by
 * hand and outlives a change of range - and a weight off the `FONT_WEIGHTS`
 * grid is the one that does real damage: it has no row in `apcaLookup`, so the
 * rating would answer about a size and weight nobody is looking at.
 */
export function normalizedTypeSettings(settings: TypeSettings): TypeSettings {
  return {
    fontSize: snapped(settings.fontSize, FONT_SIZE_RANGE, DEFAULT_TYPE_SETTINGS.fontSize),
    fontWeight: nearestStop(settings.fontWeight, WEIGHT_STOPS, DEFAULT_TYPE_SETTINGS.fontWeight),
    lineHeight: snapped(settings.lineHeight, LINE_HEIGHT_RANGE, DEFAULT_TYPE_SETTINGS.lineHeight)
  };
}


/**
 * The value clamped into the range and put on its step grid.
 *
 * The step is counted from `min`, the way a range input counts it, and the
 * result is rounded to the step's own precision - `1.2 + 3 * 0.05` is
 * 1.3500000000000003 in binary floating point, and that value would travel
 * into the preview's `line-height` and into localStorage.
 */
function snapped(value: number, range: TypeSettingRange, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;

  const clamped = Math.min(Math.max(value, range.min), range.max);
  const steps = Math.round((clamped - range.min) / range.step);
  const decimals = decimalsOf(range.step);

  return Number((range.min + steps * range.step).toFixed(decimals));
}


function nearestStop(value: number, stops: readonly number[], fallback: number): number {
  if (!Number.isFinite(value)) return fallback;

  return stops.reduce((closest, stop) =>
    Math.abs(stop - value) < Math.abs(closest - value) ? stop : closest);
}


function decimalsOf(step: number): number {
  return String(step).split(".")[1]?.length ?? 0;
}
