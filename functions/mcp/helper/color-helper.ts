export function hasAlpha(this: void, value: string): boolean {
  const hex = value.startsWith("#") ? value.slice(1) : value;

  return hex.length === 8;
}
