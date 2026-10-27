# Rule 00: Autonomous Subagent Routing & Delegation Protocol

## Core Mandate

The parent agent MUST automatically analyze incoming user requests and delegate specialized sub-tasks to the project's subagents (`creative-maverick`, `standard-setter`, `orchestrator`) via `invoke_subagent` without requiring explicit user invocation commands.

---

## Task Classification & Delegation Matrix

```
                      ┌────────────────────────┐
                      │  Incoming User Request │
                      └───────────┬────────────┘
                                  │
      ┌───────────────────────────┼───────────────────────────┐
      ▼                           ▼                           ▼
┌──────────────┐            ┌──────────────┐            ┌──────────────┐
│  UI / App    │            │ Quality / TS │            │ Multi-Step   │
│  Ideation    │            │  & Testing   │            │ Integration  │
└──────┬───────┘            └──────┬───────┘            └──────┬───────┘
       ▼                           ▼                           ▼
Auto-Invoke:                Auto-Invoke:                Auto-Invoke:
`creative-maverick`         `standard-setter`           `orchestrator`
```

---

## Automatic Trigger Rules

### 1. Trigger `creative-maverick` Subagent

**Triggers:**

- Designing or prototyping new interactive UI components (Mixtape Builder, Photo Portfolio, Audio Visualizer, canvas games, retro widgets, easter eggs).
- Requests for creative layout ideas, custom animations, sound design, or visual delight.

### 2. Trigger `standard-setter` Subagent

**Triggers:**

- Refactoring existing code, reviewing pull requests, or fixing bugs.
- Verifying TypeScript strictness, Lighthouse performance, WCAG 2.1 AA accessibility, and security.
- Writing or validating unit tests (Vitest) and E2E tests (Playwright).

### 3. Trigger `orchestrator` Subagent

**Triggers:**

- Complex multi-system feature integrations involving both creative UI and strict backend/testing pipelines.
- Updating architectural documentation (`AGENTS.md`, `DECISIONS.md`, `README.md`).
- Reconciling design vs. engineering trade-offs.

---

## Execution Workflow for Parent Agent

1. **Analyze Prompt:** Classify the primary intent of the user's prompt.
2. **Invoke Subagent:** If the task matches one of the trigger patterns above, call `invoke_subagent` with the corresponding subagent role.
3. **Synthesize & Present:** Review the subagent's output, verify compliance with repository rules, and present the final cohesive result to the user.
