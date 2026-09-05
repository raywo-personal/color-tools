export const COLOR_SPACES = ["hex", "rgb", "hsl", "oklch"] as const;

export type ColorSpace = typeof COLOR_SPACES[number];
