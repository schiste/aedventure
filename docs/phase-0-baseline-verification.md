# Phase 0 Baseline Verification

> Scope note: this baseline records the imported SkyOffice/customer
> virtual-office lane before refactoring. It is a legacy-reference check, not
> the verification baseline for the live ADD game.

## 1. Purpose

This document records the initial verification state of the imported SkyOffice
fork before major refactoring begins.

The goal is to know whether the upstream app installs and builds before we
change structure, package names, runtime boundaries, or behavior.

## 2. Date

Verification date:

```text
2026-05-23
```

## 3. Environment

Observed local tools:

```text
node v25.7.0
npm 11.10.1
yarn unavailable through Volta
```

Because Yarn is not installed globally, the baseline used a pinned Yarn v1
runner through npm:

```bash
npm exec --yes yarn@1.22.22 -- <command>
```

Pinned Yarn version:

```text
1.22.22
```

## 4. Commands Run

From:

```text
legacy/skyoffice-original/
```

Root dependency install:

```bash
npm exec --yes yarn@1.22.22 -- install --frozen-lockfile
```

Server TypeScript build:

```bash
./node_modules/.bin/tsc --project server/tsconfig.server.json
```

From:

```text
legacy/skyoffice-original/client/
```

Client dependency install:

```bash
npm exec --yes yarn@1.22.22 -- install --frozen-lockfile
```

Client production build:

```bash
npm exec --yes yarn@1.22.22 -- build
```

## 5. Results

### 5.1 Root Install

Result:

```text
pass
```

Notes:

- Dependency install completed successfully.
- Node emitted a `url.parse()` deprecation warning from dependency code.

### 5.2 Client Install

Result:

```text
pass
```

Warnings:

- `@emotion/babel-plugin` has unmet peer dependency `@babel/core`.
- `@babel/plugin-syntax-jsx` has unmet peer dependency `@babel/core`.
- `emoji-mart@3.0.1` declares older React peer ranges.
- `styled-components@5.3.5` has unmet peer dependency `react-is`.

These warnings are inherited from upstream dependency choices and do not block
the initial build.

### 5.3 Server TypeScript Build

Result:

```text
pass
```

Command:

```bash
./node_modules/.bin/tsc --project server/tsconfig.server.json
```

### 5.4 Client Production Build

Result:

```text
pass
```

Output summary:

```text
861 modules transformed
dist/assets/index.*.js around 2632 KiB
gzip around 628 KiB
```

Warning:

```text
Some chunks are larger than 500 KiB after minification.
```

This is not a Phase 0 blocker. It should be tracked as a later frontend
performance task, likely after package structure and route boundaries are
clear.

## 6. Baseline Conclusion

The imported SkyOffice fork is buildable in the current environment.

This gives Phase 0 a stable legacy-reference starting point:

- Refactor commits should keep the server TypeScript build passing.
- Refactor commits should keep the client production build passing.
- If a temporary break is unavoidable, it should be called out explicitly in
  the commit message and resolved quickly.
- The new target app stack must get its own verification commands as it is
  rebuilt under `apps/` and `packages/`.

## 7. Immediate Follow-Up Tasks

Recommended next checks:

1. Run the dev server locally and confirm the app is playable.
2. Capture a screenshot or browser smoke test once the dev server runs.
3. Identify the first narrow refactor target:
   - world config boundary,
   - realtime auth boundary,
   - or meeting provider boundary.

## 8. Repeatable Verification Script

The baseline can now be re-run with:

```bash
scripts/verify-skyoffice-baseline.sh
```

If dependencies are already installed:

```bash
SKIP_INSTALL=1 scripts/verify-skyoffice-baseline.sh
```

When `SKIP_INSTALL=1` is used, the script intentionally calls local build
binaries directly instead of invoking Yarn through npm. This keeps the normal
refactor verification loop offline and avoids registry lookups after
dependencies are installed.

This script verifies `legacy/skyoffice-original/`, not the target app. It is a
guardrail for understanding the imported reference, not a long-term product CI
pipeline.

After the hard-fork reset moved SkyOffice under `legacy/skyoffice-original/`,
the offline verification path was rerun successfully:

```bash
SKIP_INSTALL=1 scripts/verify-skyoffice-baseline.sh
```
