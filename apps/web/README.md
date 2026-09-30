# Archived former Main app

Status: archived on 2026-09-30. ADD in `apps/add-rpg/` is the active product.

This directory preserves the former Customer Virtual Office browser app. Keep
it available for reference and explicit maintenance requests; do not add
product features here by default.

The root `npm run build` and `npm run dev:http` commands now build and serve
the ADD game. To build and preview this archived app with its local API,
world-server, and media routes, use `npm run office:dev:http`; it serves at
`http://127.0.0.1:8788/app`. The office lane's regression checks remain
available through `npm run check:office`.

The former product scope and implementation plan are indexed in
`docs/office-platform-archive.md`.
