# Ictus PWA

Metronome and tuner for orchestra and band musicians, the web version of the native Ictus app.
It installs to the home screen on iPhone, iPad, Android and desktop, works offline, and needs no app store or developer account.

## Features

- **Metronome:** tempo dial (20–300 BPM), ±1/±5, tap tempo, accent / normal / mute per beat, time signatures up to 16 beats with 2+2+3-style groupings,
  subdivisions from quarter to sextuplet, swing for eighths and sixteenths, three click sounds with separate volumes, vibration (Android).
- **Practice:** gap click, polyrhythms 3:2 / 4:3 / 5:4, speed trainer, rest counter for long tacets.
- **Setlists:** save the current setup as a piece, step through pieces on stage.
- **Tuner:** chromatic tuner with staff (bass clef and flats by default, German note names: H, and B for B♭), cents meter and adjustable reference pitch.
  Drum-lug tuner that compares every tension rod with the average or a target note. The microphone is only used after you press **Start tuner**.
- **Keys and pedals:** Space starts/stops, T taps. Bluetooth page-turner pedals (←/→, ↑/↓, Page Up/Down) tap and start/stop, or step through a setlist.

## Develop

```bash
pnpm install
pnpm start          # http://localhost:4200
pnpm test           # unit tests (Vitest), watch mode
pnpm test:ci        # one run with coverage and thresholds, as in CI
pnpm lint           # ESLint: typescript-eslint strict + stylistic (type-checked), all angular-eslint rules
pnpm typecheck      # tsc for app, specs and workers
pnpm check:contrast # theme colour pairs against WCAG AA, light and dark
pnpm format         # Prettier; CI runs pnpm format:check
pnpm build          # production build in dist/ictus-pwa/browser
pnpm e2e            # build, then the Playwright end-to-end tests in every browser
pnpm e2e --project iphone   # one browser/device: chrome, firefox, safari, android, iphone, ipad
```

TypeScript runs with every strict flag (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`verbatimModuleSyntax`, …) and Angular with strict templates and all extended diagnostics as errors.
Husky runs ESLint and Prettier on staged files plus the type-check before each commit, and the tests before each push.

Tests run in jsdom against the real stores, scheduler and components. `src/testing` has the fakes for Web Audio,
workers, animation frames and the microphone, and drivers that move the audio clock beat by beat
(`MetronomeDriver`) or feed the tuner pitches (`TunerDriver`). The coverage report is in `coverage/ictus-pwa`.

### End-to-end tests

`e2e/` drives the production build in real browsers with Playwright: desktop Chrome, Firefox and
Safari (WebKit), an Android phone (Pixel 7), an iPhone and an iPad. `scripts/serve-dist.mjs` serves
the build with the headers from `vercel.json`, so every test also fails on a Content Security Policy
violation, a page error or a console error. Before the app loads, each page gets a recorder for the
clicks the metronome schedules and a stand-in microphone that plays a tone the test picks, so the
tuner can be tested the same way in every browser. `e2e/a11y.spec.ts` runs axe on every screen and
sheet in light and dark mode. Install the browsers once with `pnpm exec playwright install`.

The service worker only runs in production builds. To try offline mode and installing locally:

```bash
pnpm build && pnpm dlx http-server dist/ictus-pwa/browser -p 8080
```

## Install on iPhone or iPad

The app has to be served over **HTTPS** (the microphone and the service worker require it). Host the contents of
`dist/ictus-pwa/browser` on any static host, for example Vercel, Netlify, Cloudflare Pages or GitHub Pages.
Rewrite unknown paths to `index.html` so `/tuner` works on reload.

Then open the URL in Safari → Share → **Add to Home Screen**. It opens full screen, without browser bars, and keeps working offline.
When a new version is deployed, the app offers a **Reload** button.

## CI/CD

- **CI** (`.github/workflows/ci.yml`) runs on every pull request and push to `main`: formatting, ESLint,
  type-check, unit tests with coverage thresholds (summary in the run, report as an artifact) and a production build.
- **E2E** (`.github/workflows/e2e.yml`) runs the Playwright tests in parallel, one job per browser and OS:
  every project on Linux, WebKit on macOS, Edge on Windows. Chrome and Edge come with the runners; Firefox
  and WebKit are cached per Playwright version. A failing job uploads its report and traces.
- **Deploy:** Vercel's Git integration builds every push: `main` goes to production, other branches and
  pull requests get preview URLs. `vercel.json` adds the fallback to `index.html` (so `/tuner` works on reload),
  keeps the service worker files from being cached, and sends the security headers: a Content Security Policy
  that allows only the app's own scripts (critical CSS is not inlined, so `index.html` has no inline script),
  `Permissions-Policy` limiting the microphone to the app, `nosniff`, a referrer policy and no framing.

## Structure

| Folder                                                        | Contents                                                                                                        |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/app/music`                                               | Pure music logic: meters, groupings, note names, staff placement, practice tools, drum tuning                   |
| `src/app/audio`                                               | Web Audio click scheduler, click synthesis, YIN pitch detector (in a web worker), microphone                    |
| `src/app/state`                                               | Signal-based stores, saved to localStorage                                                                      |
| `src/app/shared`                                              | Small helpers without a domain, e.g. `clamp`                                                                    |
| `src/app/ui`                                                  | Shared controls: sheet (native `<dialog>`), segmented pills, number stepper, switch (all signal-forms controls) |
| `src/app/metronome`, `tuner`, `setlists`, `settings`, `pages` | Screens and their components                                                                                    |
| `src/testing`                                                 | Test fakes and drivers for the unit tests (not part of the app build)                                           |
| `e2e`                                                         | Playwright end-to-end and accessibility tests                                                                   |
| `scripts`                                                     | `check-contrast.mjs` (run in CI), `serve-dist.mjs` (serves the build for the e2e tests)                         |

## Differences from the native app

- iOS browsers have no vibration API, so vibration only works on Android.
- A web page can't tell whether headphones are connected, so the tuner always pauses while the click plays
  (the native app keeps listening when the click goes to headphones).
- Audio stops when the app is in the background on iOS, as with every web app.

Bravura font © Steinberg Media Technologies, SIL Open Font License (`public/fonts/Bravura-OFL.txt`).
