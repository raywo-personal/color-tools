#!/usr/bin/env node
//
// Checks the two CLAUDE.md rules that are plain text in a template, so ESLint
// never sees them:
//
//   "Sizes Are Relative, Never Pixels" - an arbitrary Tailwind value carrying
//   an absolute length (text-[10px], h-[30px], max-w-[1240px]) ignores the
//   browser's font size setting, so a visitor who enlarges text gets a layout
//   that does not follow.
//
//   "Layouts Are Mobile-First" - the unprefixed utility describes the narrow
//   column and sm:/lg: widen it, so a max-* variant walks a desktop layout
//   back instead.
//
// Plus two rules from the Accessibility section: the type floor - nothing goes
// below text-sm - and the ring offset a focusable element on a visitor color
// has to carry.
//
// Run through `pnpm lint`.

const fs = require("node:fs");
const path = require("node:path");

const V1_SCREENS = require("./v1-screens");

const ROOT = path.join(__dirname, "..");

// Every place a Tailwind class can appear: .html templates, the inline
// `template` and `host: {class: "..."}` of a component, and the global
// stylesheet. The remaining .scss files are v1 leftovers that go with their
// screens, and CLAUDE.md forbids adding more, so new styling is always covered.
const SCANNED_EXTENSIONS = [".html", ".ts", ".css"];
const SCANNED_ROOT = "src";

const SKIPPED_DIRECTORIES = new Set(["node_modules", ".angular", "dist", "tmp"]);

// The named breakpoints a variant can carry, and the CSS units that ignore the
// browser's font size setting.
const BREAKPOINTS = "sm|md|lg|xl|2xl";
const ABSOLUTE_UNITS = "px|pt|pc|in|cm|mm|Q";

// The type floor of the Accessibility section, as a number: text-sm is
// 0.875rem and nothing goes below it.
const TYPE_FLOOR = 0.875;

const CHECKS = [
  {
    name: "absolute-length",
    // A utility with an arbitrary value containing an absolute length, e.g.
    // `text-[10px]`, `max-w-[1240px]`, `shadow-[0_0_0_2px_red]`.
    pattern: new RegExp(
      String.raw`[a-z][a-z0-9-]*-\[[^\]\s]*?\d(?:\.\d+)?(?:${ABSOLUTE_UNITS})(?![a-zA-Z0-9%])[^\]\s]*\]`,
      "g",
    ),
    message:
      "arbitrary absolute length - divide by 16 and take the nearest step of Tailwind's rem scale",
  },
  {
    name: "absolute-length-property",
    // Tailwind's arbitrary property syntax carries no utility name in front of
    // the bracket, so the check above never sees it: `[font-size:10px]`,
    // `[--ring-offset:2px]`. The declaration inside is what makes it an
    // arbitrary property rather than an attribute selector.
    pattern: new RegExp(
      String.raw`\[(?:--)?[a-zA-Z][a-zA-Z-]*:[^\]\s]*?\d(?:\.\d+)?(?:${ABSOLUTE_UNITS})(?![a-zA-Z0-9%])[^\]\s]*\]`,
      "g",
    ),
    message:
      "arbitrary absolute length - divide by 16 and take the nearest step of Tailwind's rem scale",
  },
  {
    name: "max-variant",
    // The lookbehind keeps `max-w-`, `max-h-` and a `max-width:` media query
    // out - they continue with something else. A `-` in front is allowed on
    // purpose: `group-max-sm:` and `not-max-lg:` stack the same variant.
    pattern: new RegExp(
      String.raw`(?<![a-zA-Z0-9])max-(?:${BREAKPOINTS}|\[[^\]\s]*\]):`,
      "g",
    ),
    message:
      "max-* variant - write the narrow column unprefixed and widen it with sm:/lg:",
  },
  {
    name: "type-below-text-sm",
    pattern: /(?<![a-zA-Z0-9-])text-xs(?![a-zA-Z0-9-])/g,
    message: "text-xs is below the text-sm floor for readable text",
  },
  {
    name: "arbitrary-type-below-text-sm",
    // The check above matches one class name, so the relative spelling of the
    // same size walks past it - and that is the spelling the rule steers into,
    // because "divide by 16" turns a 12px draft into 0.75rem. Both syntaxes
    // reach font size: the utility with an arbitrary value (`text-[0.75rem]`,
    // `text-[length:0.7em]`) and the arbitrary property
    // (`[font-size:0.75rem]`).
    //
    // `em` is compared against the same floor as `rem`. It is relative to the
    // parent rather than the root, so a value below the floor is not
    // necessarily below it on screen - but reading the parent chain needs the
    // rendered document, and a nested `em` is not the reason anyone writes
    // `text-[0.7em]`.
    pattern:
      /(?:(?<![a-zA-Z0-9-])text-\[(?:length:)?|\[font-size:)(\d*\.?\d+)r?em\]/g,
    accept: (match) => Number.parseFloat(match[1]) < TYPE_FLOOR,
    message: `below the text-sm floor (${TYPE_FLOOR}rem) for readable text`,
  },
];

// The ring-offset rule is about a whole element, not a line: the color binding,
// the focusability and the class list sit in different attributes of the same
// open tag, and a tag in this codebase spans several lines. So it matches open
// tags over the whole file rather than line by line.
//
// The alternation skips over quoted attribute values, so a `>` inside one -
// `(click)="a > b"` - does not end the tag early.
const OPEN_TAG = /<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)\/?>/g;

// Elements are only scanned where a template lives: an .html file, or the
// inline `template` of a component.
const TEMPLATE_EXTENSIONS = [".html", ".ts"];

// A visitor color reaches an element as a style binding or as a custom
// property, and not only through `background`: a swatch outlined in the
// visitor's color or an SVG chip filled with it is the same rule. These are the
// app's own colors, not the six neutral tokens, so a ring drawn in a token can
// vanish against them.
//
// A custom property counts only when its name says color. Geometry travels the
// same way - `[style.--fill-percent]` on a slider - and needs no ring offset.
const VISITOR_COLOR_BINDING =
  /\[style\.(?:background|[\w-]*colou?r\b|fill\b|stroke\b|box-?shadow\b)/i;

// Native focusable elements, plus anything that opts in through tabindex. A
// literal `tabindex="-1"` opts out again; a bound value cannot be evaluated
// here and counts as focusable. `[attr.tabindex]` is this codebase's house
// style, so the `attr.` prefix is optional throughout.
const FOCUSABLE_TAGS = new Set([
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
]);

const RING_OFFSET = /(?:outline|ring)-offset-/;

const TABINDEX = String.raw`(?:^|\s)\[?(?:attr\.)?tabindex\]?\s*=`;
const DESTINATION = String.raw`(?:^|\s)\[?(?:attr\.)?(?:href|routerLink)\]?\s*=`;

function isFocusable(tagName, attributes) {
  if (new RegExp(`${TABINDEX}\\s*["']-1["']`).test(attributes)) return false;
  if (new RegExp(TABINDEX).test(attributes)) return true;

  if (!FOCUSABLE_TAGS.has(tagName.toLowerCase())) return false;

  // An anchor without a destination is not in the tab order. routerLink
  // produces one, so it counts.
  if (tagName.toLowerCase() === "a") {
    return new RegExp(DESTINATION, "i").test(attributes);
  }

  return true;
}

/**
 * Finds focusable elements that carry a visitor color but no ring offset.
 *
 * This proves the offset is there, not that the ring is visible against the
 * color - that needs rendered pixels. It reads the element's own class list, so
 * an offset arriving any other way looks missing from here: inherited from a
 * parent, set on a component's `host`, or written as `outline-offset` in the
 * component's own `.css`. Put the utility on the element itself.
 */
function ringOffsetFindings(file, text) {
  if (!TEMPLATE_EXTENSIONS.includes(path.extname(file.relative))) return [];

  const findings = [];

  OPEN_TAG.lastIndex = 0;

  let match;
  while ((match = OPEN_TAG.exec(text)) !== null) {
    const [, tagName, attributes] = match;

    if (!VISITOR_COLOR_BINDING.test(attributes)) continue;
    if (!isFocusable(tagName, attributes)) continue;
    if (RING_OFFSET.test(attributes)) continue;

    const before = text.slice(0, match.index);
    const line = before.split("\n").length;
    const column = match.index - (before.lastIndexOf("\n") + 1) + 1;

    findings.push({
      file: file.relative,
      line,
      column,
      match: `<${tagName}>`,
      message:
        "focusable element on a visitor color without outline-offset-* or ring-offset-* - a ring drawn in a token vanishes against that color",
    });
  }

  return findings;
}

/** Turns the glob patterns of v1-screens.js into matchers over posix paths. */
function ignoreMatchers(patterns) {
  return patterns.map((pattern) => {
    const source = pattern
      .split("**")
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");

    return new RegExp(`^${source}$`);
  });
}

const IGNORED = ignoreMatchers(V1_SCREENS);

function isIgnored(relativePath) {
  return IGNORED.some((matcher) => matcher.test(relativePath));
}

function collectFiles(directory, found = []) {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) collectFiles(absolute, found);
      continue;
    }

    if (!SCANNED_EXTENSIONS.includes(path.extname(entry.name))) continue;

    const relative = path.relative(ROOT, absolute).split(path.sep).join("/");

    if (!isIgnored(relative)) found.push({absolute, relative});
  }

  return found;
}

function findingsIn(file) {
  const text = fs.readFileSync(file.absolute, "utf8");
  const findings = ringOffsetFindings(file, text);

  text.split("\n").forEach((line, index) => {
    for (const check of CHECKS) {
      // A global regex carries its lastIndex between calls.
      check.pattern.lastIndex = 0;

      let match;
      while ((match = check.pattern.exec(line)) !== null) {
        // A check whose rule is about a value rather than a spelling matches
        // broadly and decides here - a regex cannot compare numbers.
        if (check.accept && !check.accept(match)) continue;

        findings.push({
          file: file.relative,
          line: index + 1,
          column: match.index + 1,
          match: match[0],
          message: check.message,
        });
      }
    }
  });

  return findings.sort((a, b) => a.line - b.line || a.column - b.column);
}

function main() {
  const files = collectFiles(path.join(ROOT, SCANNED_ROOT));
  const findings = files.flatMap(findingsIn);

  if (findings.length === 0) {
    console.log(`lint-sizes: ${files.length} files, no findings.`);
    return 0;
  }

  let current = "";
  for (const finding of findings) {
    if (finding.file !== current) {
      current = finding.file;
      console.error(`\n${current}`);
    }

    console.error(
      `  ${finding.line}:${finding.column}  ${finding.match}  ${finding.message}`,
    );
  }

  const plural = findings.length === 1 ? "" : "s";
  console.error(`\nlint-sizes: ${findings.length} finding${plural}.`);

  return 1;
}

process.exit(main());
