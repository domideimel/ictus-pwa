// Checks the colour pairs Ictus composes itself from the ng-liquid-glass tokens against WCAG 2.2 AA,
// in light and dark mode: 4.5:1 for text, 3:1 for the parts of controls you need to see (1.4.11).
// The library checks its own pairs (AAA) with `lg-contrast`; this covers the app's dial, beat dots,
// tuner and staff. jsdom has no layout, so axe can't check colour contrast in the unit tests.
// Run: node scripts/check-contrast.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const css = readFileSync(require.resolve('@domideimel/ng-liquid-glass/theme.css'), 'utf8');

/** `--lg-name: light-dark(#light, #dark)` (or a plain hex) from the first top-level :root block. */
function tokens() {
  const block = /:root\s*\{([^}]*)\}/.exec(css.replace(/\/\*[\s\S]*?\*\//g, ''))?.[1];
  if (!block) throw new Error('No :root block in the ng-liquid-glass theme');
  const light = {};
  const dark = {};
  for (const [, name, value] of block.matchAll(/--lg-([\w-]+):\s*([^;]+);/g)) {
    const pair = /^light-dark\(\s*(#[\da-f]{6})\s*,\s*(#[\da-f]{6})\s*\)$/i.exec(value.trim());
    const hex = /^#[\da-f]{6}$/i.exec(value.trim());
    if (pair) [light[name], dark[name]] = [pair[1], pair[2]];
    else if (hex) light[name] = dark[name] = hex[0];
  }
  return { light, dark };
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const channel = (value) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (color) => {
  const [r, g, b] = color.map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};

const TEXT = 4.5;
const UI = 3;

/** [foreground, background, minimum, where] with token names without the `--lg-` prefix. */
const PAIRS = [
  ...['bg', 'surface'].flatMap((under) => [
    ['accent', under, TEXT, 'accented beat number, loaded piece, "Play!"'],
    ['accent', under, UI, 'tempo arc, accent beat ring, current lug'],
    ['control-border', under, UI, 'beat dot and lug rings'],
    ['success', under, UI, 'tuner needle in tune, microphone dot'],
    ['warning', under, UI, 'tuner needle off pitch'],
    ['warning', under, TEXT, 'drum advice, tuner notice'],
    ['fg-muted', under, TEXT, 'section labels, captions'],
  ]),
  ['on-accent', 'accent', TEXT, 'playing beat, play button'],
  ['accent', 'accent-surface', TEXT, 'practice chips'],
  ['success', 'success-surface', TEXT, 'in-tune pill, lug in tune'],
  ['warning', 'warning-surface', TEXT, 'off-pitch pill, lug off pitch'],
  ['fg-muted', 'surface-muted', TEXT, 'neutral tuning pill, staff caption'],
  ['fg', 'surface-muted', TEXT, 'staff notes on the paper card'],
  ['fg-muted', 'border', TEXT, 'muted beat while it plays'],
];

let failures = 0;
for (const [scheme, colors] of Object.entries(tokens())) {
  const color = (name) => {
    if (!colors[name]) throw new Error(`Unknown colour token "--lg-${name}"`);
    return rgb(colors[name]);
  };
  for (const [fg, bg, minimum, where] of PAIRS) {
    const value = ratio(color(fg), color(bg));
    if (value < minimum) {
      failures += 1;
      console.error(
        `${scheme}: ${fg} on ${bg} is ${value.toFixed(2)}:1, needs ${minimum}:1 (${where})`,
      );
    }
  }
}

if (failures > 0) process.exit(1);
console.log(`Colour contrast: all ${PAIRS.length} pairs pass in both colour schemes.`);
