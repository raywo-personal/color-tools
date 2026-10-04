export function inRgbRange(this: void, value: number | null): value is number {
  if (value === null) return false;

  return value >= 0 && value <= 255;
}
