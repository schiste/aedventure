# Archived Office and Platform Lane

Status: archived on 2026-09-30. ADD is the active Aedventure product.

The former Customer Virtual Office app was the repository's earlier main
browser app. Its code and documents are preserved in place so their history,
assets, and implementation can still be inspected. This is a source archive,
not an active product roadmap. New work belongs to ADD unless the user
explicitly asks to revive the office product.

## Preserved code

- `apps/web/`: the former office browser app.
- `apps/api/`, `apps/world-server/`, and `apps/media-gateway/`: the former
  app's local API, world, and media services.
- `packages/office-domain/`, `packages/auth-wikimedia/`, and
  `packages/policy/`: office and platform-specific packages.
- Office-oriented shared renderer work remains where it is, but new shared
  engine work requires an active ADD consumer.

## How to inspect the archive

The repository's default `npm run build` and `npm run dev:http` commands
build and serve ADD. The former office app remains available on request:

```sh
npm run office:dev:http
```

That command builds the preserved office app and serves it at
`http://127.0.0.1:8788/app`, with its local API, world, and media routes.
`npm run check:office` remains available for explicit archive maintenance.

## Historical planning documents

- [Customer Virtual Office product specification](customer-virtual-office-platform-spec.md)
- [Office development rollout plan](development-rollout-plan.md)
- [Hard-fork architecture](hard-fork-architecture.md)
- [Phase 0 reset plan](phase-0-refactor-plan.md)
- [Phase 0 baseline](phase-0-baseline-verification.md)
- [Office renderer performance budget](renderer-performance-budget.md)
- [AI map readiness](ai-map-readiness.md)
- [Avatar atlas import path](avatar-atlas-import-path.md)
- [SkyOffice fork maintenance](skyoffice-fork-maintenance.md)
- [Initial license audit](license-audit.md)

These documents explain past decisions and constraints. Their future-tense
roadmaps are not active ADD work.
