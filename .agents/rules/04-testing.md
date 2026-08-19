# Rule 04: Mandatory Automated Testing Strategy

## Core Mandate
Every single feature, component, API route, or interactive widget on this website **MUST** be covered by automated tests before being declared complete. Uncovered features are not allowed to be merged or pushed.

---

## Canonical Testing Stack (Mandatory Standard Tooling)

| Test Type | Framework | Command | Purpose |
| :--- | :--- | :--- | :--- |
| **Unit & Integration** | **Vitest + React Testing Library** | `npm run test` | Testing utility functions, state logic (Mixtape app reducers), and API route handlers. |
| **End-to-End (E2E)** | **Playwright + Axe Core** | `npm run test:e2e` | Testing real browser interactions, keyboard navigation, full page loads, canvas graphics, and accessibility. |

---

## Testing Guidelines & Standards

1. **Unit Testing (Vitest):**
   - Utility functions and helpers (`src/utils/*`) must have 100% unit test coverage.
   - React state management logic (e.g., Mixtape track addition, reordering) must be unit tested.
   - API endpoints (`src/pages/api/*`) must be unit tested with mocked fetch calls (e.g., testing Spotify OAuth refresh failures and success payloads).

2. **E2E Testing (Playwright):**
   - Every page route (`/`, `/blog`, `/music`, `/portfolio`, `/mixtape`) must have a Playwright smoke test checking HTTP status 200 and DOM rendering.
   - Interactive components (Mixtape tape spools, Canvas game controls, audio player controls) must be tested with simulated user input (clicks, keypresses).
   - Accessibility (a11y) checks must be run during Playwright test runs (using `@axe-core/playwright`).

3. **CI/CD Requirement:**
   - All tests (`npm run test` and `npx playwright test`) must pass cleanly in continuous integration before deployment.

4. **Git Hooks & Staging (Husky + lint-staged):**
   - **Pre-commit (`.husky/pre-commit`):** Runs `npm run check` (typecheck) and `npx lint-staged` (Biome & Prettier formatting). Any auto-fixes applied to staged files are safely re-staged into the active commit.
   - **Pre-push (`.husky/pre-push`):** Runs `npm run test` (Vitest unit tests) and `npm run build` (Astro production build verification) prior to remote push.
