// Serves the production build like Vercel does, for the end-to-end tests: the headers from
// vercel.json (so the tests also prove the Content Security Policy) and the index.html fallback.
// Run: node scripts/serve-dist.mjs [port]   (build first: pnpm build)
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not URL.pathname, so the path also works on Windows (C:\…).
const root = fileURLToPath(new URL('../dist/ictus-pwa/browser/', import.meta.url));
const base = root.endsWith(sep) ? root : root + sep;
const port = Number(process.argv[2] ?? process.env.PORT ?? 4310);
if (!existsSync(join(root, 'index.html'))) {
  console.error(`No build in ${root}. Run pnpm build first.`);
  process.exit(1);
}

const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
/** Vercel's `source` patterns are path-to-regexp; the ones in vercel.json are plain regexes in groups. */
const rules = vercel.headers.map(({ source, headers }) => ({
  pattern: new RegExp(`^${source}$`),
  headers: Object.fromEntries(headers.map(({ key, value }) => [key, value])),
}));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
};

createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  let file = normalize(join(root, path));
  // Nothing outside the build folder, whatever ../ the path contains.
  if (!file.startsWith(base)) {
    response.writeHead(403).end();
    return;
  }
  // Like the rewrite in vercel.json: paths without a file extension are the app's routes.
  if (!existsSync(file) || statSync(file).isDirectory()) {
    if (extname(path)) {
      response.writeHead(404).end();
      return;
    }
    file = join(root, 'index.html');
  }
  const headers = { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' };
  for (const rule of rules) if (rule.pattern.test(path)) Object.assign(headers, rule.headers);
  // upgrade-insecure-requests would send the page's requests to https://localhost, which has no server.
  const csp = headers['Content-Security-Policy'];
  if (csp) headers['Content-Security-Policy'] = csp.replace(/;\s*upgrade-insecure-requests/, '');
  response.writeHead(200, headers);
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`Serving ${root} on http://localhost:${port}`);
});
