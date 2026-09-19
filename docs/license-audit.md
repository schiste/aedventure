# Initial License Audit

> Scope note: this audit primarily covers the imported SkyOffice and customer
> virtual-office/platform lane. It quarantines legacy material; it does not
> make legacy assets a dependency of the live ADD game.

## 1. Purpose

This document records the initial licensing findings from the imported
SkyOffice fork and defines the hard-fork licensing policy.

This is an engineering audit, not legal advice. Final commercial/open-source
distribution should get legal review.

## 2. Current Findings

### 2.1 SkyOffice Code License Mismatch

Observed files:

```text
legacy/skyoffice-original/LICENSE
legacy/skyoffice-original/readme.md
legacy/skyoffice-original/package.json
```

Findings:

- `LICENSE` contains the MIT License.
- `readme.md` says the project is licensed under MIT.
- `package.json` says `"license": "ISC"`.

Decision:

- Treat inherited SkyOffice code as MIT unless legal review decides otherwise.
- Preserve upstream MIT notices.
- Do not propagate the ISC package metadata into the new target app.
- Fix license metadata in target app packages on day one.

### 2.2 Asset Risk

Observed:

- `legacy/skyoffice-original/readme.md` credits LimeZu assets.
- The app bundles sprites, tilesets, characters, maps, and item art under
  `legacy/skyoffice-original/client/public/assets/`.

Risk:

- Assets may allow commercial use but still restrict resale or redistribution.
- That is not compatible with a fully open-source distribution if assets are
  bundled in the repository.

Decision:

- Treat all inherited SkyOffice assets as development-only reference assets.
- Do not copy them into the target app.
- Create an asset manifest before target app asset loading is implemented.
- Use only CC0, CC-BY-compatible, GPL-compatible, or project-owned assets in
  the target app.

### 2.3 WBO / Whiteboard

Observed:

- SkyOffice embeds WBO for whiteboards.
- WBO licensing and deployment assumptions require separate review before
  reuse.

Decision:

- Do not treat the inherited WBO integration as approved product architecture.
- Reevaluate whiteboard integration after auth, persistence, movement, and
  media layers are replaced.

### 2.4 PeerJS

Observed:

- PeerJS is used for video and screen sharing in legacy client code.

Decision:

- PeerJS is not part of the target media architecture.
- Target media architecture is LiveKit plus coturn.

## 3. Target Licensing Policy

New app code:

```text
AGPL-3.0-or-later
```

Inherited SkyOffice code:

```text
MIT notices preserved
```

Third-party assets:

Allowed only if:

- License permits redistribution in this repository.
- License permits the intended open-source distribution.
- Attribution requirements are captured in an asset manifest.
- Source URL and license text are recorded.

Disallowed in target app:

- Assets that cannot be redistributed.
- Assets with unclear licensing.
- Assets that can be used commercially but cannot be bundled.
- Assets that require marketplace-specific restrictions incompatible with the
  repository license.

## 4. Required Asset Manifest

Manifest path:

```text
assets/ASSET_MANIFEST.md
```

Required fields:

- Asset ID.
- File path.
- Source URL.
- Author.
- License.
- Attribution text.
- Redistribution allowed: yes/no.
- Commercial use allowed: yes/no.
- Modified: yes/no.
- Notes.

## 5. Week 1 License Gates

Week 1 is complete only when:

- License mismatch is documented.
- Legacy assets are quarantined under `legacy/`.
- Target app does not bundle inherited non-open assets.
- Asset manifest format exists.
- Root licensing policy is documented.
