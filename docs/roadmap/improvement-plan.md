# Deployment Playground Improvement Plan

## Scope

This plan extends the original `plan.md` and completed `task.md` after M3. It excludes browser E2E work for now and focuses on product polish, maintainability, and simulation depth.

## P0: Current Implementation Tasks

- [x] Add this improvement plan and task list.
- [x] Add component-specific logos/icons in the left palette.
- [x] Add the same component logos/icons to canvas nodes.
- [x] Add non-E2E tests to ensure every palette component has icon metadata.
- [x] Run focused tests, lint, and build after the icon work.

## P1: Product Polish

- [ ] Sync `plan.md` roadmap checkboxes with completed `task.md` milestones, or mark it as the original historical plan.
- [ ] Fix outdated stack notes: the app uses React 19 and `@xyflow/react`; Recharts and ShadcnUI are not currently installed.
- [ ] Improve visual hierarchy in dense panels, especially the palette, inspector, event controls, and snapshot comparison area.
- [ ] Add empty, invalid-import, and storage-limit states for snapshot/template workflows.
- [ ] Add keyboard-friendly shortcuts for common simulator actions: run once, pause, reset, save snapshot.

## P2: Maintainability

- [ ] Split `src/App.tsx` into focused components: `PalettePanel`, `CanvasPanel`, `InspectorPanel`, `DashboardPanel`, `ScenarioPanel`, `SnapshotPanel`, and `DebugPanel`.
- [ ] Move UI-only mapping data, such as component icons and term keys, out of `App.tsx`.
- [ ] Extract snapshot import/export UI into a component backed by existing `src/engine/snapshots.ts` functions.
- [ ] Add component-level tests for extracted panels using Vitest and Testing Library.

## P3: Simulation Depth

- [ ] Extend event effects beyond QPS, capacity, and latency to include cache hit rate, replica lag, queue backlog, indexing lag, auth failures, and cost.
- [ ] Add `spike` and `seasonal` traffic patterns, plus traffic segments for canary, bot, and allowlist traffic.
- [ ] Add scenario-specific event presets so each scenario starts with realistic failure drills.
- [ ] Add richer postmortem recommendations tied to failed goals and active events.

## P4: Scenario Coverage

- [ ] Add a monolith-to-microservices migration scenario.
- [ ] Add a content static distribution scenario focused on CDN origin pressure and object storage throughput.
- [ ] Add a realtime data platform scenario focused on Kafka backlog, backpressure, and consumer autoscaling.
- [ ] Add scenario coverage tests that assert required node kinds, unlock chains, and scoring thresholds stay coherent.

## P5: Non-E2E Quality Gates

- [ ] Ensure CI runs `npm run lint`, `npm test`, `npm run test:perf`, and `npm run build`.
- [ ] Add unit coverage for snapshot import validation and template-market persistence.
- [ ] Add accessibility checks for form labels, icon-only controls, and color contrast in heatmap states.
