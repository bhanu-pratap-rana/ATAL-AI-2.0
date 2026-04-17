# E2E Suite (Task 15)

Scope: smoke + cross-role + offline + PWA verification.

## Status

| Spec | MCP-dep | Status |
|------|---------|--------|
| `00-pwa-install.spec.ts`     | no  | implemented |
| `01-auth-flow.spec.ts`       | yes (user fixtures) | TODO — needs Supabase test branch |
| `02-role-gating.spec.ts`     | no  | implemented (unauth redirect path) |
| `03-lesson-play-progress.spec.ts` | yes (exec_sql) | TODO |
| `04-assessment-pre-post.spec.ts`  | yes (exec_sql) | TODO |
| `05-realtime-teacher-grid.spec.ts` | yes (2 contexts + seed) | TODO |
| `06-offline-replay.spec.ts`   | yes (SW + fixtures) | TODO |
| `07-cache-headers.spec.ts`    | partial (auth routes) | TODO |
| `08-a11y-axe.spec.ts`         | no (but needs `@axe-core/playwright`) | TODO |
| `09-visual-regression.spec.ts` | no (baselines) | TODO |

Specs marked TODO were deferred because Supabase MCP was unavailable at audit time
and dropping fixtures into the real project DB would pollute state. When MCP comes
back, seed via `mcp__supabase__create_branch` and wire `helpers/supabase-fixtures.ts`.

## Running

```bash
npm --workspace apps/web run test:e2e -- tests/e2e/
```

Uses the existing `playwright.config.ts` (testDir is `./tests`, so `e2e/` is picked up).
