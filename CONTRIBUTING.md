# Contributing

Thanks for helping grow the Cloudflare Workers Templates library! Templates are one of our highest-leverage ways to teach the platform — a good one turns "what can I build?" into a deployed app in minutes.

This guide is the **single source of truth** for contributing. If anything elsewhere (wiki, `CLAUDE.md`, `AGENTS.md`) disagrees with this file, **this file wins** — please open a PR to fix the other doc.

## TL;DR

1. Get the code onto a branch (Cloudflarian fast-path or fork — see below).
2. Add a directory ending in `-template`.
3. Run `pnpm install`, build your template, then `pnpm run fix` and `pnpm run check`.
4. Open a PR against `main`. CI + the `/bonk` review bot will tell you exactly what's missing.
5. A maintainer approves and merges. Public release happens on a tagged release.

---

## Who can contribute, and how

### Cloudflarians (fast-path)

You can push branches directly to the repo.

1. Branch off `main` (no fork needed). If you don't have write access, ping the [DevDash Platform chat](https://chat.google.com/room/AAAA52PsKts?cls=7).
2. Add your template, open a PR against `main`.
3. Your PR automatically gets CI, a `/bonk` review, and (once you add the **`allow preview`** label) a dashboard preview link.

### External contributors (fork + label)

We welcome external templates. Because PRs from forks run in an untrusted context, previews are gated:

1. Fork the repo and open a PR against `main` from your fork.
2. CI (lint, tests) runs automatically.
3. A maintainer adds the **`allow preview`** label to generate a dashboard preview link (this is a safety gate, not a judgment — it just lets us run trusted preview steps against your code).
4. A maintainer reviews and merges.

> Not sure your idea is a fit? Open a [Template Request issue](https://github.com/cloudflare/templates/issues/new/choose) first and we'll give early feedback before you build.

---

## What makes a good template

- **Use-case driven, not tech-driven.** Name it for what it _does_ ("Astro AI Chat Bot"), not the binding it uses ("DO + Assets Template").
- **Uses at least one Worker binding.** Bindings are the value prop. Provisionable today: D1, Hyperdrive, KV, Queues, R2, Vectorize. No-provision bindings (Durable Objects, Workflows, Browser Rendering) work out of the box.
- **Has a visible UI.** Enough frontend that a newcomer understands what's happening. Worker-only? Serve a simple `public/` landing page via Workers Assets.
- **Current, not experimental.** Use stable, GA features and recommended defaults. Avoid beta-only APIs that may churn.
- **Single Worker.** Workers Builds doesn't deploy monorepos cleanly — one Worker per template.

---

## Requirements

These are the rules. The ones marked **[CI]** are enforced automatically — run `pnpm run check` locally and `pnpm run fix` to auto-resolve most of them. The ones marked **[human]** need a maintainer (usually an asset upload to the Cloudflare Templates account).

### Directory & naming **[CI]**

- Directory ends in `-template` and matches the `name` in `package.json` and the `name` in `wrangler.json(c)`.

### `package.json`

Our pipeline reads a `cloudflare` object from each template's `package.json` to render it in the dashboard. The "Enforced" column reflects what actually fails CI today (the template linter in `cli/`):

| Required?    | Key                                        | Enforced                | Description                                                                                              | Example                                            |
| ------------ | ------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| ✅           | `name`                                     | linter (`name` match)   | Kebab-case, matches directory, ends in `-template`                                                       | `durable-chat-template`                            |
| ✅           | `description`                              | not linted (keep it!)   | One brief line; read by the pipeline for the dashboard card                                              | `Chat in real-time using Durable Objects.`         |
| ✅           | `scripts.dev`                              | linter                  | Local dev command                                                                                        | `wrangler dev`                                     |
| ✅           | `scripts.deploy`                           | linter                  | Deploy command                                                                                           | `wrangler deploy`                                  |
| ✅           | `private: true` and **no** `version` field | supplemental check      | Templates are not published packages                                                                     |                                                    |
| ✅           | `cloudflare.label`                         | linter                  | Title Case dashboard name                                                                                | `Durable Chat App`                                 |
| ✅           | `cloudflare.products`                      | linter (must be array)  | ≤ 3 products, most distinctive ones                                                                      | `["Durable Objects"]`                              |
| ✅           | `cloudflare.categories`                    | linter (must be array)  | Array; values limited to `"starter"`, `"storage"`, `"ai"`. Use `[]` if none apply                        | `["starter"]`                                      |
|              | `cloudflare.bindings`                      | not linted              | Per-binding help (esp. external API keys). Inline `` `code` ``, `**bold**`, `[links](https://…)` allowed | `{ "API_KEY": { "description": "Get one at …" } }` |
| if `publish` | `cloudflare.preview_image_url`             | linter (when `publish`) | 16:9, ≥ 500px screenshot — **[human]** uploaded by a maintainer                                          | (provided in review)                               |
| if `publish` | `cloudflare.preview_icon_url`              | linter (when `publish`) | SVG icon — **[human]** uploaded by a maintainer                                                          | (provided in review)                               |
|              | `cloudflare.publish`                       | n/a                     | `true` to feature in the dashboard gallery. Omit otherwise. **[human]** confirmed by a maintainer        | `true`                                             |

> **`label`, `products`, and `categories` are required even if you're not publishing.** The linter requires them whenever a `cloudflare` object exists (use `categories: []` if none apply). Only the preview image/icon are gated behind `publish: true`.
>
> **You do not need `publish: true` to contribute.** Many useful templates live in the repo without being featured in the dashboard. Leave it out unless a maintainer asks; they'll handle the preview assets and `publish` flip.

### `wrangler.json(c)` **[CI]**

- Use `wrangler.json` or `wrangler.jsonc` — **not** `wrangler.toml` (the linter auto-converts on `pnpm run fix`).
- `compatibility_date` set to the repo's target date, `observability: { enabled: true }`, `upload_source_maps: true`, `name` matching the template.
- **Top-level bindings only.** Deploy to Cloudflare reads top-level bindings; bindings nested in environments won't configure correctly.

### `README.md` **[CI for markers, human for content]**

- A **Deploy to Cloudflare** button at the very top.
- A "getting started" section: run locally, install any third-party tokens, what the app does.
- A screenshot and/or live demo link.
- Wrap the dashboard-facing summary in markers:

  ```md
  <!-- dash-content-start -->

  Shown on the Template Details Page in the dashboard:
  key features, bindings/frameworks used, how it works.

  <!-- dash-content-end -->
  ```

  This block **should not** contain bootstrapping commands, shell snippets, or extra images — keep those in the full README outside the markers.

### `.gitignore` **[CI]**

- Must exist and ignore `node_modules` and `.wrangler`. A sensible default (plus framework add-ons) is in [the appendix](#appendix-default-gitignore).

### `package-lock.json` **[CI]**

- Deploy to Cloudflare sets up Workers CI; a committed `package-lock.json` cuts module resolution time ~80%. Generate it with `pnpm run fix:lockfiles`.

### Secrets & environment variables

- Use [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [env vars](https://developers.cloudflare.com/workers/configuration/environment-variables/), or [Secrets Store](https://developers.cloudflare.com/secrets-store/).
- Add a `.dev.vars.example` (or `.env.example`) documenting every required secret.
- Validate them at runtime and **show a visible warning in the deployed UI** if anything's missing (see the [saas-admin example](https://saas-admin-template.templates.workers.dev/admin)).

### Tests **[CI runs them; count is a review guideline]**

Two layers, both required. CI runs your tests and fails on failures, but it does not _count_ them — the "minimum 5" is enforced by reviewers (and `/bonk`), not the linter:

1. **Unit tests** — `vitest` via [`@cloudflare/vitest-pool-workers`](https://developers.cloudflare.com/workers/testing/vitest-integration/get-started/write-your-first-test/). **Minimum 5 meaningful tests** covering your template's core functionality.
2. **Playwright E2E** — a `playwright-tests/{template-name}.spec.ts` smoke test of the critical user path. See the [E2E section in the README](./README.md#end-to-end-testing).

### Code quality

- TypeScript everywhere.
- Use **Hono** for API routing unless you have a specific reason not to (don't hand-roll path routing in `fetch`).
- Comment the Cloudflare-specific parts — these are teaching tools.

---

## Local workflow

```bash
pnpm install
# build your template...
pnpm run fix             # auto-format, auto-fix lint, convert wrangler.toml→json, generate lockfiles
pnpm run check           # most CI checks (lint, lockfiles, prettier) — must pass
cd <your-template-dir> && pnpm test   # run just your template's unit tests
pnpm run test:e2e        # Playwright smoke tests
```

`pnpm run check` covers most—but not all—CI. The `private: true` / no-`version` rule runs in a separate supplemental check, and `description` isn't linted at all, so double-check those by hand. If CI is red, `pnpm run fix` resolves most of it, and the `/bonk` bot will comment on your PR with anything outstanding.

## Getting your PR reviewed

- **`/bonk` reviews internal PRs automatically** and posts a checklist review. On any PR (including forks) you can trigger it with `/bonk` or `@ask-bonk review this PR`, or ask it questions (`/bonk why is the lockfile check failing?`).
- A human maintainer gives the final approve + merge.
- **Preview images/icons and `publish: true` are handled by maintainers** after review — call out in your PR description that they're pending, and attach the screenshot you'd like used.

## Checklist

- [ ] Directory ends in `-template`; names match across `package.json` and `wrangler.json(c)`
- [ ] `package.json` has `description`, `scripts.dev`, `scripts.deploy`, `private: true`, no `version`
- [ ] `cloudflare` object has `label`, `products` (≤ 3), and `categories` (use `[]` if none)
- [ ] `wrangler.json(c)` (not `.toml`), top-level bindings, observability on
- [ ] `README.md` with Deploy button at top + `dash-content` markers
- [ ] `.gitignore` present (ignores `node_modules/` and `.wrangler/`)
- [ ] `package-lock.json` committed (`pnpm run fix:lockfiles`)
- [ ] ≥ 5 vitest tests + a Playwright E2E spec
- [ ] `pnpm run check` passes locally + your template's `pnpm test` passes
- [ ] PR opened against `main`; screenshot attached if you want it featured

---

## Appendix: default `.gitignore`

At minimum you must ignore `node_modules/` and `.wrangler/`. The Workers-specific block below is the part most generic `.gitignore` generators miss — start with it, then append any framework block you need.

```txt
# Dependencies
node_modules/

# Wrangler
.wrangler/
.env*
!.env.example
.dev.vars*
!.dev.vars.example
```

A fuller base (macOS, Node, logs, caches) plus framework add-ons:

<details>
<summary>Framework-specific blocks</summary>

```txt
### Astro ###
.astro/

### OpenNext ###
.open-next/
next-env.d.ts

### Next.js ###
.next
out

### React Router ###
.react-router/
/build/

### Remix ###
/build/

### SvelteKit ###
.svelte-kit
```

</details>

For a complete, copy-pasteable base block, see any recent template's `.gitignore` (e.g. [`durable-chat-template/.gitignore`](https://github.com/cloudflare/templates/blob/main/durable-chat-template/.gitignore)).
