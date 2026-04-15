# Copilot / AI agent guidance for caption-proxy

This file gives short, practical instructions so an AI coding agent can be immediately productive in this repository.

## Big picture
- Small Node.js HTTP service (single-file) that proxies caption/subtitle requests.
- Main entry: `server.js`. Package metadata: `package.json` (script: `npm start` → `node server.js`).
- Public API: GET /captions?url=<external_https_url> — the server fetches the provided URL using Node's `https` module and returns the response body.

## Key implementation details to know
- `server.js` uses Node's built-in `https.get` (not `fetch`). That means: no automatic redirect-following, streaming behavior, and low-level error handling.
- It sets request headers to mimic a browser (see the `options.headers` block). Example header lines in `server.js`:
  - `'Referer': 'https://www.youtube.com/'`
  - `'Origin': 'https://www.youtube.com'`
  - browser-like `User-Agent`
- CORS: responses include `Access-Control-Allow-Origin: *` (set in the proxy response before sending fetched data).
- The code only supports HTTPS URLs because it uses `https` module directly.

## Why this structure exists
- The service is intentionally minimal: it aims to bypass cross-origin issues and present external caption responses to clients. Mimicked headers increase the chance the external site returns the caption payload.

## Common tasks & commands
- Run locally: `npm install` then `npm start` (or `node server.js`). The server listens on `process.env.PORT` or `3000`.
- Quick check: GET request to `http://localhost:3000/captions?url=https://...` (must be a full `https://` URL).

## Patterns & conventions to preserve
- Keep behaviour of `https.get` unless you intentionally change semantics (for example, switching to `node-fetch` or `undici` should also add redirect handling and tests).
- Minimal dependencies: only `express` is declared in `package.json`. Prefer built-in modules where lightweight is beneficial.

## Integration points & pitfalls for changes
- External dependency: any caption source (YouTube caption endpoints, etc.). Ensure requests include the same or compatible headers if you change them.
- Redirects: `https.get` does not follow 3xx redirects automatically. If adding redirect handling, ensure it remains permissive for common caption URLs.
- Error handling: current code returns generic `500` on request errors and `400` when `url` is missing. If expanding, follow the same minimal error surface and preserve response content-type behavior.

## Examples (what to look at in code)
- Endpoint definition: `app.get('/captions', (req, res) => { ... })` in `server.js`.
- Headers block: `const options = { headers: { ... } }` — change carefully.
- Start command: `scripts.start` → `node server.js` in `package.json`.

## When you propose changes, include in PR
- A short explanation why the change is needed (e.g., follow redirects to support provider X).
- Quick manual test steps (example request URL used for verification).
- If you change the HTTP client (from `https` to `fetch`), include a small test or script demonstrating the same behavior (headers + CORS + redirect handling).

## Notes for future agents
- There are no tests or CI in the repo. Add tests only when you cover the proxy semantics (happy path + missing `url` + upstream error + redirect case).
- Keep changes minimal and well-documented: this repo is intended as a small utility service.

---
If anything here is unclear or you want more/less detail (e.g., add example curl commands, tests, or a CONTRIBUTING section), tell me which parts to expand and I'll iterate.
