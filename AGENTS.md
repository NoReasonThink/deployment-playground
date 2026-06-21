# Repository Guidelines

## Project Structure & Module Organization

This is a React 19 + TypeScript + Vite deployment simulation playground. Entry points are `src/main.tsx` and `src/App.tsx`; shared styles live in `src/index.css` and `src/App.css`. Use `src/engine/` for simulation logic, `src/data/` for scenarios and catalogs, `src/store/` for Zustand state, and `src/components/` for reusable UI. Tests are colocated as `*.test.ts` or `*.test.tsx`. Docs live in `docs/`.

## Build, Test, and Development Commands

Use `npm ci` to install dependencies from `package-lock.json`.

- `npm run dev`: start the Vite development server.
- `npm run build`: run TypeScript project builds, then produce the Vite production bundle.
- `npm run preview`: preview the built app locally.
- `npm run lint`: run ESLint across the repository.
- `npm test`: run the full Vitest suite once.
- `npm run test:perf`: run only the performance baseline test.

## Coding Style & Naming Conventions

Use TypeScript, two-space indentation, single-quote imports, and extensionless local imports. Name React components in `PascalCase`, hooks with `use` prefixes, tests as `feature.test.ts` or `feature.integration.test.ts`, and exports with descriptive camelCase names. Keep simulation rules in `src/engine/`, not UI components.

## Testing Guidelines

Vitest with jsdom and Testing Library is the test stack. Add focused unit tests next to engine or data logic, integration tests for cross-module behavior, and `*.e2e.test.tsx` tests for user-visible workflows. Run `npm test` before submitting changes; include `npm run test:perf` for performance-sensitive simulation code.

## Commit & Pull Request Guidelines

Recent history uses concise subject lines, including Conventional Commit style such as `feat: complete milestones, docs and term help UX`; keep subjects imperative and scoped. Pull requests should include a summary, verification commands, linked issue or task context, and screenshots or recordings for UI changes. Call out scenario, scoring, or guardrail changes explicitly.

## Agent-Specific Instructions

Use Codegraph MCP before broad text searches for code-structure questions or unfamiliar flows. Prefer `codegraph_context` for "how does this work?", `codegraph_trace` for call paths, and `codegraph_impact` before refactors; use `rg` for exact strings or non-indexed files.

Use Chrome DevTools MCP for browser debugging. Start with `npm run dev`, then use snapshots, console logs, network requests, screenshots, and performance traces to verify UI behavior, runtime errors, layout issues, and Vite-served assets.

## Security & Configuration Tips

Do not commit secrets, local environment files, or generated `dist/` output. Keep risk bounds and simulation guardrails aligned with `src/config/guardrails.ts` and `docs/risk-and-guardrails.md` when adding new scenarios or policies.
