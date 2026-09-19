# SkyOffice Fork Maintenance

> Scope note: this document governs the quarantined SkyOffice reference and
> customer virtual-office/platform maintenance only. It is not a dependency or
> roadmap for the live ADD game.

## 1. Import Strategy

SkyOffice is imported as a non-squashed Git subtree and then moved to:

```text
legacy/skyoffice-original/
```

This keeps the upstream SkyOffice commits visible in this repository's Git
history while making clear that SkyOffice is reference code, not the target
application architecture.

Upstream remote:

```text
skyoffice https://github.com/kevinshen56714/SkyOffice.git
```

Imported upstream HEAD:

```text
3f66b8bffad889ee9fc2340f9bcad28146299f47
```

## 2. Why Subtree Instead Of Plain Copy

A plain file copy loses the original commit graph.

A subtree import:

- Preserves upstream commits in the repository graph.
- Keeps upstream attribution clear.
- Allows future upstream pulls.
- Avoids nested `.git` directories.
- Lets the imported code live under `legacy/skyoffice-original/`.

## 3. Future Upstream Pulls

To fetch upstream updates:

```bash
git fetch skyoffice
```

To merge upstream changes into the app subtree:

```bash
git subtree pull --prefix=legacy/skyoffice-original skyoffice master
```

Do not use `--squash` if the goal is to keep upstream commit history.

Because the subtree was originally imported under `apps/customer-virtual-office`
and then moved to `legacy/skyoffice-original`, future upstream pulls may require
careful path handling. Prefer testing upstream sync on a throwaway branch before
doing it on `main`.

## 4. Commit Hygiene

Avoid mixing these concerns in a single commit:

- Upstream imports.
- File moves.
- Package renames.
- Behavioral refactors.
- Formatting-only changes.
- Asset cleanup.

Preferred sequence:

1. Import upstream.
2. Verify baseline.
3. Add docs.
4. Refactor one boundary at a time.
5. Rename after behavior is stable.

## 5. Asset Policy

All inherited SkyOffice assets should be treated as development-only until a
commercial and open-source redistribution review is complete.

The target app must not bundle non-open assets. Legacy assets may remain under
`legacy/skyoffice-original/` temporarily for reference, but new app code should
load only assets that are covered by the future asset license manifest.

## 6. Local Backup Note

An initial plain-copy import was moved out of the repository before the subtree
import.

Temporary backup path:

```text
/private/tmp/aedventure-skyoffice-copy-without-history
```

This backup is not part of the project and can be deleted later if no longer
needed.
