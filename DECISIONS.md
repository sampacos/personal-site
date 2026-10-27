# Architectural Decision Records (ADRs)

## ADR-001: Web Framework Selection

- **Date:** 2026-08-19
- **Status:** Approved
- **Context:** Personal website with blog, music integrations (Spotify/SoundCloud), game-like photo gallery, and interactive mixtape builder app.
- **Decision:** Selected **Astro 7 + React + Tailwind CSS 4**.
- **Rationale:**
  - Zero-JS by default for blog/static pages (maximum performance & LCP).
  - Isolated React Islands for complex interactive apps (Mixtape Builder, Game Canvas).
  - Astro API endpoints (`/api/*`) securely handle OAuth token refresh without leaking secrets to the client.
  - Free deployment on Vercel/Cloudflare Pages/GitHub Pages.

## ADR-002: AI Agent Triad Governance Architecture

- **Date:** 2026-08-19
- **Status:** Approved
- **Context:** High-quality open-source repository balance between strict software standards and creative/fun UI experimentation.
- **Decision:** Established a 3-agent triad:
  1. `standard-setter` (Perfectionist code quality, strict TypeScript, performance, accessibility)
  2. `creative-maverick` (Fun, interactive UI, mixtape app, game canvas, playfulness)
  3. `orchestrator` (Architectural synthesis, documentation, ADR maintenance)
- **Persisted Files:** [`AGENTS.md`](file:///Users/sampacos/repos/personal-site/AGENTS.md), [`.agents/rules/`](file:///Users/sampacos/repos/personal-site/.agents/rules), [`.agents/subagents/`](file:///Users/sampacos/repos/personal-site/.agents/subagents).

## ADR-003: Automated Testing Strategy (Vitest + Playwright)

- **Date:** 2026-08-19
- **Status:** Approved
- **Context:** Mandate that 100% of website features must have automated test coverage.
- **Decision:** Adopted **Vitest** for Unit/Integration testing and **Playwright** for E2E/Visual regression testing.
- **Rationale:**
  - **Vitest:** Native Vite integration (matches Astro build pipeline), instant execution, native TypeScript support, effortless mocking of API routes (`/api/spotify`).
  - **Playwright:** Multi-browser headless E2E testing (Chromium, Firefox, WebKit), full keyboard accessibility automation, visual canvas snapshot testing.
- **Rule Spec:** [`.agents/rules/04-testing.md`](file:///Users/sampacos/repos/personal-site/.agents/rules/04-testing.md).

## ADR-004: Husky Pre-Commit & Pre-Push Git Hooks

- **Date:** 2026-08-19
- **Status:** Approved
- **Context:** Prevent broken builds, failing tests, or unverified features from entering the git history or remote repository.
- **Decision:** Configured **Husky** + **`lint-staged`** with `.husky/pre-commit` and `.husky/pre-push` hooks.
- **Execution:**
  - **Pre-commit:** Runs `npm run check` (typecheck) and `npx lint-staged` (`biome check --write` & `prettier --write`). Any auto-fixes applied to staged files are automatically re-staged into the commit without affecting unstaged work.
  - **Pre-push:** Runs `npm run test` (Vitest unit tests) and `npm run build` (Astro build verification) prior to remote synchronization.

## ADR-005: Modern Typechecking, Linting & Formatting Pipeline

- **Date:** 2026-08-19
- **Status:** Approved
- **Context:** Need cutting-edge, ultra-fast typechecking, linting, and formatting for an open-source Astro + React + Tailwind codebase.
- **Decision:** Adopted **Biome 2.5** for linting/formatting (`npm run lint`), **`astro check` + `tsc --noEmit`** for typechecking (`npm run check`), and **Prettier** with `prettier-plugin-tailwindcss` for class sorting.
- **Rationale:**
  - **Biome:** Ultra-fast Rust-based linting (< 5ms per run) for `.ts`, `.tsx`, `.json`, and `.css` files.
  - **Astro Check:** Guarantees template prop type safety and frontmatter script validation.
  - **Prettier + Tailwind Plugin:** Automatically sorts Tailwind utility classes logically for clean CSS structure.

## ADR-006: Autonomous Subagent Routing & Delegation Protocol

- **Date:** 2026-08-19
- **Status:** Approved
- **Context:** Enable automatic subagent task delegation without manual user routing.
- **Decision:** Established [`.agents/rules/00-router.md`](file:///Users/sampacos/repos/personal-site/.agents/rules/00-router.md).
- **Behavior:**
  - **Interactive UI & Creative Features:** Automatically spawns `creative-maverick`.
  - **Code Reviews, Testing & Standards:** Automatically spawns `standard-setter`.
  - **System Integrations & Architecture Docs:** Automatically spawns `orchestrator`.

## ADR-007: Halo CE PACOS Homepage Main Menu Architecture

- **Date:** 2026-08-19
- **Status:** Superseded by ADR-008
- **Context:** Build an interactive clone of the Halo CE main menu for the home page featuring "PACOS" branding, Web Audio Gregorian chant intro, 60 FPS HTML5 canvas background, and WCAG AA keyboard accessibility.
- **Implementation:** Previously implemented as `HaloMenu.tsx` (now removed in favor of Craigslist design).

## ADR-008: Craigslist-Inspired Minimalist Homepage Redesign

- **Date:** 2026-08-19
- **Status:** Approved
- **Context:** Reset homepage design direction to a clean, fast, early-web Craigslist-style classifieds directory with white background, left sidemenu, default blue links that turn purple when visited, a dark theme toggle, and a persistent tiny bottom-right background music button.
- **Implementation:**
  - [`src/pages/index.astro`](file:///Users/sampacos/repos/personal-site/src/pages/index.astro): Craigslist layout with left sidemenu, mini calendar widget, categorized classifieds grid (community, blog writings, projects, music, gear, services), and classic footer.
  - [`src/components/ThemeToggle.tsx`](file:///Users/sampacos/repos/personal-site/src/components/ThemeToggle.tsx): Zero-flash light/dark theme switcher with `localStorage` persistence.
  - [`src/components/MusicToggle.tsx`](file:///Users/sampacos/repos/personal-site/src/components/MusicToggle.tsx): Discreet fixed bottom-right music play/pause toggle with audio state indicators.
  - Link styling: Classic default blue (`#0000ee`) and visited purple (`#551a8b`) with high-contrast accessible variants in dark mode.

## ADR-009: Spotify Live Playback Integration & Serverless API Architecture

- **Date:** 2026-08-19
- **Status:** Approved
- **Context:** Enable live, real-time public playback status on `/music` without requiring website visitors to authenticate or expose private Spotify API secrets.
- **Implementation:**
  - [`src/lib/spotify.ts`](file:///Users/sampacos/repos/personal-site/src/lib/spotify.ts): Server-side helper using OAuth2 Refresh Token rotation with fallback to recently played tracks when idle.
  - [`src/pages/api/spotify/now-playing.ts`](file:///Users/sampacos/repos/personal-site/src/pages/api/spotify/now-playing.ts): Serverless API route delivering cached, lightweight JSON payload to client widgets.
  - [`src/components/Listening.tsx`](file:///Users/sampacos/repos/personal-site/src/components/Listening.tsx): Craigslist-styled live component polling the endpoint every 15s.
  - [`src/pages/music.astro`](file:///Users/sampacos/repos/personal-site/src/pages/music.astro): Clean music page featuring SoundCloud link and live Spotify widget.
  - [`scripts/exchange-spotify-code.mjs`](file:///Users/sampacos/repos/personal-site/scripts/exchange-spotify-code.mjs): Interactive CLI token generator supporting HTTPS redirect URIs.
