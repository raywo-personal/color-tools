export type NewClickSource = "palettes" | "convert" | "contrast";


/**
 * Maps a route path to the tool whose "New" action the top bar should trigger.
 *
 * Anything that is not a feature route - the wildcard route above all - falls
 * back to the converter. The button then does what its caption says instead of
 * matching no case at all, which is what an unchecked cast to `NewClickSource`
 * used to produce.
 */
export function routePathToSource(routePath: string): NewClickSource {
  const segment = routePath.split("/")[1];

  switch (segment) {
    case "palettes":
    case "contrast":
      return segment;
    default:
      return "convert";
  }
}
