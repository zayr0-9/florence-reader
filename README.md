# Florence Reader MVP

A reader-first Next.js App Router prototype for an ebook website.

## What this MVP includes

- landing page with upload CTA
- library page with recent books
- single-pane demo reader
- real PDF.js / EPUB.js rendering for uploaded local books
- local IndexedDB storage for uploads and progress
- background reading event API route
- subtle memory + image pipeline status UI
- first-pass on-disk memory and image agents using @hyper-labs/hyper-router + OpenRouter

## Routes

- `/` — landing page
- `/library` — recent books
- `/reader/demo` — demo reader
- `/reader/[bookId]` — reader for seeded and uploaded books
- `/api/reading-events` — memory/background event endpoint
- `/api/image-events` — image prompt/background event endpoint

## Memory agent test setup

This branch includes a first-pass memory creation agent implemented through `@hyper-labs/hyper-router`:

- runtime SDK: `@hyper-labs/hyper-router`
- provider: `OpenRouterProvider`
- model: `moonshotai/kimi-k2.5`
- agent input: memory so far + current page text
- tool: `create_memory`
- tool behavior: append-only writes to markdown files on disk
- skip rule: if the page has no extracted text, the memory agent is not called
- session mode: stable per-book hyper-router session id
- dedupe: same book + reading unit + identical extracted text will not append twice

Memory markdown files are written under:

- `memory-artifacts/<book-id>.md`

hyper-router transcript storage is written under:

- `memory-artifacts/hyper-router-memory-sessions.json`

memory dedupe cache is written under:

- `memory-artifacts/memory-dedupe.json`

## Image agent test setup

This branch also includes a first-pass image prompt agent implemented through `@hyper-labs/hyper-router`:

- runtime SDK: `@hyper-labs/hyper-router`
- provider: `OpenRouterProvider`
- model: `google/gemini-2.5-flash-image`
- agent input: memory so far + previous/current/next page text
- tool: `create_image`
- tool behavior: append a polished image prompt to markdown on disk
- skip rule: if the page has no extracted text, the image agent is not called
- session mode: stable per-book hyper-router session id
- dedupe: same book + reading unit + identical extracted text will not write twice

Image prompt files are written under:

- `memory-artifacts/images/<book-id>-<reading-unit>.md`

image hyper-router transcript storage is written under:

- `memory-artifacts/hyper-router-image-sessions.json`

image dedupe cache is written under:

- `memory-artifacts/image-dedupe.json`

Set your API key before running:

```bash
cp .env.example .env.local
```

Then add:

```bash
OPENROUTER_API_KEY=your_key_here
```

## Run

```bash
pnpm --dir d:/Florence/florence-reader dev
```

## Debugging in the reader UI

The reader side panel currently shows a small memory debug block with:

- session id
- runtime status
- transcript file path
- dedupe hit/fresh run
- last tool output

## Notes

This version is still intentionally reader-first:

- AI runs quietly in the background
- the memory agent is narrow and append-only
- the image agent currently writes high-quality prompts to disk for inspection
- memory and image artifacts are currently stored on disk for inspection
- both agents now use `@hyper-labs/hyper-router` instead of direct manual OpenRouter fetches

## Next build steps

1. Verify memory and image prompt quality across real PDFs and EPUBs.
2. Improve exact last-opened page/location restore.
3. Replace prompt-only image output with real image generation/storage.
4. Decide whether to persist artifacts in IndexedDB, server DB, or sync storage later.

## Vercel Sandbox execution

The `/api/reading-buffer` route now executes the memory + image agent loop inside an ephemeral Vercel Sandbox VM created from a reusable base snapshot.

What stays the same:

- browser sends `priorMemoryState` + buffered reading units
- sandbox worker returns `ReadingBufferResponse`
- browser persists results in IndexedDB as before
- no transcript persistence is required

What changed:

- agent execution is isolated in Vercel Sandbox
- the runtime environment is prepared once and reused via a VM snapshot
- `/api/reading-buffer` acts as a sandbox orchestration proxy

### Required env vars

Add these to `.env.local`:

```bash
OPENROUTER_API_KEY=your_key_here
VERCEL_ACCESS_TOKEN=your_vercel_token_here
# optional: reuse an already-created base snapshot
VERCEL_SANDBOX_BASE_SNAPSHOT_ID=
```

In production on Vercel, OIDC-based sandbox auth is automatic. For local development, `VERCEL_ACCESS_TOKEN` is the simplest fallback if you do not have `VERCEL_OIDC_TOKEN` available.

### Create the base snapshot

You can warm and create the reusable base VM snapshot with:

```bash
pnpm sandbox:create-snapshot
```

The command prints the snapshot id. Save it into:

```bash
VERCEL_SANDBOX_BASE_SNAPSHOT_ID=...
```

If `VERCEL_SANDBOX_BASE_SNAPSHOT_ID` is not set, the app will lazily build a base snapshot on the first sandboxed request and keep it in process memory for reuse.

### Sandbox runtime files

The sandbox worker lives under:

- `sandbox-runtime/reading-buffer-worker.ts`

The route-side sandbox runner lives under:

- `lib/vercel-sandbox-runner.ts`

The worker receives JSON input through a temp file inside the VM and emits JSON response back over stdout.
