# Avatar Atlas Import Path

> Scope note: this document covers the customer virtual-office avatar renderer
> and its shared asset contract. ADD player presentation has its own app and
> content boundary.

The avatar renderer now treats sprite art as a manifest-backed contract. Real
PNG/JSON atlases can be added later without changing `AvatarRenderer` or the
animation state machine.

## Runtime Contract

- Stable semantic frame key:
  `internal-avatar-atlas-v1/frames/{avatarId}/{action}/{direction}/{frameIndex}`
- Real manifest path:
  `/assets/avatar-atlases/internal-avatar-atlas-v1/manifest.json`
- Real image path:
  `/assets/avatar-atlases/internal-avatar-atlas-v1/atlas.png`
- Server direction model: `4_way`
- Visual direction model: `8_way`
- Frame key strategy: `avatar_action_server_direction_frame`

The renderer exposes both identifiers:

- `frameKey`: semantic animation frame key from the atlas contract.
- `textureKey` / `textureFrame`: concrete Phaser render target.

Current generated avatars use `runtime_generated_fallback` and create one
fallback texture per semantic frame plus visual facing:

```text
{semanticFrameKey}::generated::{visualFacing}
```

That keeps diagonal preview frames visually distinct while preserving the same
semantic frame keys a real atlas will use.

## Manifest Shape

```json
{
  "schemaVersion": 1,
  "atlasId": "internal-avatar-atlas-v1",
  "textureKey": "internal-avatar-atlas-v1-real",
  "imagePath": "/assets/avatar-atlases/internal-avatar-atlas-v1/atlas.png",
  "frameWidth": 32,
  "frameHeight": 42,
  "exportScale": 2,
  "anchor": { "x": 0.5, "y": 0.86 },
  "frameKeyStrategy": "avatar_action_server_direction_frame",
  "serverDirectionModel": "4_way",
  "visualDirectionModel": "8_way",
  "license": {
    "spdx": "CC-BY-SA-4.0",
    "source": "https://example.invalid/source"
  },
  "frames": [
    {
      "semanticFrameKey": "internal-avatar-atlas-v1/frames/ember/idle/down/00",
      "atlasFrameKey": "ember_idle_down_00",
      "avatarId": "ember",
      "action": "idle",
      "direction": "down",
      "frameIndex": 0,
      "rect": { "x": 0, "y": 0, "width": 64, "height": 84 }
    }
  ]
}
```

The validator requires every expected semantic frame to exist before the real
atlas can become active. Until then, generated fallback frames remain active.

## Contract Coverage

The renderer now reports the atlas contract through
`render_game_to_text.avatars.animationPipeline.atlasContract`.

Current expected import surface:

- Avatars: `ember`, `cobalt`, `moss`, `violet`
- Server directions: `up`, `down`, `left`, `right`
- Visual facings: `up`, `upRight`, `right`, `downRight`, `down`, `downLeft`,
  `left`, `upLeft`
- States: `idle`, `walk`, `run`, `turn`
- Animation definitions: `4 avatars * 4 states * 4 server directions = 64`
- Atlas frames:
  - `idle`: 64 frames
  - `walk`: 96 frames
  - `run`: 128 frames
  - `turn`: 64 frames
  - Total: 352 frames
- Preview fixtures:
  `4 avatars * 4 states * 8 visual facings = 128`

The preview gallery remains the QA tool for animation atlas readiness. It
renders every avatar/state/visual-facing combination, while the actual atlas
manifest remains server-direction based. That lets the renderer validate
4-direction imported art and still inspect 8-way visual presentation before a
real atlas is activated.

Manifest validation now checks:

- required schema, strategy, direction models, frame dimensions, export scale,
  and license metadata
- missing expected semantic frame keys
- unexpected semantic frame keys
- duplicate semantic frame keys
- duplicate concrete atlas frame keys
- frame metadata mismatch against the semantic contract
- rect origin/dimensions and optional anchor bounds

Activation rule:

```text
real_manifest_must_validate_else_runtime_generated_fallback
```

Generated placeholders therefore remain available as the development fallback,
but future real art has a precise import contract and can fail before Phaser
mutates scene textures or animation state.
