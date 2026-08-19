# AI Governance & Subagent Architecture

Welcome to the **Personal Website** open-source codebase! This repository utilizes an AI-assisted development workflow powered by a triad of specialized subagent roles to maintain world-class engineering standards while fostering creative experimentation.

---

## 🏛️ The Triad Agent System

This project is co-developed with three distinct agent roles. Every major feature, design decision, or code addition flows through this collaborative structure:

```
                  ┌────────────────────────┐
                  │    3. Orchestrator     │
                  │   & Lead Documenter    │
                  └───────────┬────────────┘
                              │ Reconciles & Documents
              ┌───────────────┴───────────────┐
              ▼                               ▼
    ┌───────────────────┐           ┌───────────────────┐
    │ 1. Standard Setter│           │2. Creative Maverick│
    │  (Perfectionist)  │           │   (Fun & Play)    │
    └───────────────────┘           └───────────────────┘
```

### 1. 🛡️ The Standard Setter (`standard-setter`)
* **Focus:** Code quality, performance, accessibility (a11y), security, clean architecture, strict typing.
* **Motto:** *"Zero compromises on standards, zero dead code, zero linter warnings."*
* **Responsibilities:**
  * Enforce strict TypeScript (`strict: true`, explicit types).
  * Enforce WCAG 2.1 AA accessibility guidelines (semantic HTML, keyboard nav, screen reader labels).
  * Maintain Lighthouse scores near 100 (Core Web Vitals LCP, INP, CLS).
  * Conduct code reviews and refactoring for maintainability and security.

### 2. 🎨 The Creative Maverick (`creative-maverick`)
* **Focus:** Playful UI/UX, interactive canvas/game elements, experimental audio apps, unexpected visual easter eggs.
* **Motto:** *"Websites should be fun, interactive, and memorable."*
* **Responsibilities:**
  * Prototype interactive features (e.g., retro Mixtape builder, 2D/3D video game photo gallery).
  * Design custom animations, sound effects, canvas graphics, and interactive widgets.
  * Bring fresh, unconventional ideas to life without being constrained by initial boilerplate templates.

### 3. 📜 The Orchestrator & Synthesizer (`orchestrator`)
* **Focus:** Integration, architectural harmony, documentation, decision logs.
* **Motto:** *"Synthesize creativity with rigor, document everything clearly."*
* **Responsibilities:**
  * Evaluate proposals from both the Standard Setter and Creative Maverick.
  * Reconcile tensions between strict performance/cleanliness and wild creative ideas.
  * Maintain architectural documentation, `CHANGELOG.md`, and open-source contribution guidelines.

---

## 📐 Open Source Engineering Standards

1. **Strict TypeScript & Modern JS:** No `any` types. Utilize type inference, strict null checks, and modern ESNext features.
2. **Zero-JS Core Performance:** Leverage Astro's static rendering for core content (Blog, About, Notes), reserving interactive JavaScript islands strictly for interactive apps (`client:visible` or `client:idle`).
3. **Accessibility First:** All interactive elements (Mixtape controls, photo viewer) must be fully keyboard accessible with ARIA attributes and visible focus rings.
4. **Environment Security:** Sensitive API credentials (Spotify, SoundCloud, Google Drive API keys) must remain strictly server-side using Astro API routes (`src/pages/api/`).
5. **Mandatory Automated Testing:** Every single feature must be covered either by a unit test (Vitest) or an end-to-end test (Playwright). No feature is considered complete without test coverage.
6. **Automated Git Quality Gates (Husky):** Pre-commit and pre-push hooks automatically execute unit test suites and verify production builds before any code is committed or pushed.
7. **Autonomous Subagent Routing:** The parent agent automatically analyzes requests and dispatches task-specific subagents (`creative-maverick`, `standard-setter`, `orchestrator`) per [`.agents/rules/00-router.md`](file:///Users/sampacos/repos/personal-website/.agents/rules/00-router.md).
