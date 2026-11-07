// Checks the theme's colour pairs against WCAG 2.2 AA in both colour schemes: 4.5:1 for text,
// 3:1 for the parts of controls you need to see (1.4.11). jsdom has no layout, so axe can't check
// colour contrast in the unit tests; this reads the tokens straight from src/styles.css instead.
// Run: node scripts/check-contrast.mjs
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

/** `--color-name: #rrggbb` declarations inside the block that starts at `marker`. */
function tokens(marker) {
  const start = css.indexOf(marker);
  if (start < 0) throw new Error(`No "${marker}" block in styles.css`);
  const block = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries(
    [...block.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(([, name, hex]) => [name, hex]),
  );
}

const dark = tokens('@theme');
const schemes = { dark, light: { ...dark, ...tokens('(prefers-color-scheme: light)') } };

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
/** A Tailwind `bg-x/15` tint: `x` at `alpha` over `under`. */
const tint = (color, alpha, under) =>
  color.map((c, i) => Math.round(alpha * c + (1 - alpha) * under[i]));

const TEXT = 4.5;
const UI = 3;

/** [foreground, background, minimum, where]; a background is a token or [token, alpha, under]. */
const PAIRS = [
  ...['bg', 'panel', 'surface'].flatMap((under) => [
    ['fg', under, TEXT, 'body text'],
    ['muted', under, TEXT, 'secondary text'],
    ['accent-text', under, TEXT, 'amber text and links'],
    ['in-tune', under, TEXT, 'in-tune text'],
    ['ring', under, UI, 'beat dot, lug and switch borders'],
    ['accent', under, UI, 'tempo arc, play button'],
  ]),
  ['faint', 'bg', TEXT, 'muted beat number'],
  ['faint', 'surface', TEXT, 'muted beat number'],
  ['accent-text', ['accent', 0.15, 'bg'], TEXT, 'practice chips, tuning pill'],
  ['accent-text', ['accent', 0.15, 'panel'], TEXT, 'practice chips on the tablet card'],
  ['accent-text', ['accent', 0.2, 'surface'], TEXT, 'drum lug off pitch'],
  ['in-tune', ['in-tune', 0.15, 'bg'], TEXT, 'in-tune pill'],
  ['in-tune', ['in-tune', 0.25, 'surface'], TEXT, 'drum lug in tune'],
  ['muted', ['muted', 0.15, 'bg'], TEXT, 'neutral tuning pill'],
  ['on-accent', 'accent', TEXT, 'text on amber buttons'],
  ['bg', 'fg', TEXT, 'selected chips'],
  ['ink', 'paper', TEXT, 'staff card'],
  ['paper-label', 'paper', TEXT, 'staff card caption'],
];

let failures = 0;
for (const [scheme, colors] of Object.entries(schemes)) {
  const color = (name) => {
    if (!colors[name]) throw new Error(`Unknown colour token "${name}"`);
    return rgb(colors[name]);
  };
  for (const [fg, bg, minimum, where] of PAIRS) {
    const back = Array.isArray(bg) ? tint(color(bg[0]), bg[1], color(bg[2])) : color(bg);
    const value = ratio(color(fg), back);
    if (value < minimum) {
      failures += 1;
      const label = Array.isArray(bg) ? `${bg[0]}/${bg[1] * 100} over ${bg[2]}` : bg;
      console.error(
        `${scheme}: ${fg} on ${label} is ${value.toFixed(2)}:1, needs ${minimum}:1 (${where})`,
      );
    }
  }
}

if (failures > 0) process.exit(1);
console.log(`Colour contrast: all ${PAIRS.length} pairs pass in both colour schemes.`);
